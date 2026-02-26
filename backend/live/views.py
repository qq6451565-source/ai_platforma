import json
import time
import uuid

import jwt
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from lessons.models import Lesson
from profiles.models import StudentProfile
from tests_app.permissions import IsAdmin, IsTeacherOrAdmin
from .tasks import sync_live_rooms

from .models import (
    LiveParticipant, 
    LiveRoom,
    LiveFaceSession,
    LiveFaceEvent,
    FaceVerificationSettings,
)
from .serializers import (
    LiveParticipantSerializer, 
    LiveRoomSerializer,
    FaceVerificationSettingsSerializer,
    LiveFaceSessionSerializer,
    LiveFaceEventSerializer,
    LiveMonitoringSerializer,
)

try:
    from agora_token_builder import RtcTokenBuilder, Role_Publisher
except Exception:  # pragma: no cover - optional dependency
    RtcTokenBuilder = None
    Role_Publisher = 1


def _student_group_id(user: User):
    try:
        group_id = user.student_profile.group_id
        if group_id:
            return group_id
    except StudentProfile.DoesNotExist:
        pass
    return getattr(user, "group_id", None)


def _ensure_teacher_can_access(request, lesson: Lesson):
    role = getattr(request.user, "role", None)
    if request.user.is_superuser or role == "admin":
        return
    if role == "teacher" and lesson.teacher_subject.teacher_id == request.user.id:
        return
    raise PermissionDenied("Bu dars sizga tegishli emas.")


def _ensure_user_can_join(request, lesson: Lesson):
    role = getattr(request.user, "role", None)
    if request.user.is_superuser or role in ["admin", "teacher"]:
        if role == "teacher" and lesson.teacher_subject.teacher_id != request.user.id:
            raise PermissionDenied("Bu dars sizga tegishli emas.")
        return
    if role == "student":
        group_id = _student_group_id(request.user)
        if not group_id or group_id != lesson.group_id:
            raise PermissionDenied("Bu dars sizga tegishli emas.")
        return
    raise PermissionDenied("Ruxsat yo'q.")


def _build_ws_url() -> str:
    return settings.LIVEKIT_URL


def _build_livekit_token(user: User, room_name: str) -> str:
    now = int(time.time())
    role = getattr(user, "role", None)
    resolved_role = role or ("admin" if user.is_superuser else "user")
    full_name = user.get_full_name() or user.username
    group_name = ""
    if resolved_role == "student":
        try:
            group = user.student_profile.group
            if group:
                group_name = group.name or ""
        except StudentProfile.DoesNotExist:
            group_name = ""
    grants = {
        "room": room_name,
        "roomJoin": True,
        "canSubscribe": True,
        "canPublish": True,
        "canPublishData": True,
    }
    metadata = json.dumps(
        {
            "role": resolved_role,
            "full_name": full_name,
            "group_name": group_name,
        }
    )
    payload = {
        "iss": settings.LIVEKIT_API_KEY,
        "sub": str(user.id),
        "name": full_name,
        "nbf": now - 10,
        "exp": now + settings.LIVEKIT_TOKEN_TTL,
        "video": grants,
        "metadata": metadata,
    }
    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm="HS256")


def _agora_role_for(user: User) -> int:
    # Studentlar ham video publish qiladi (mic stage bo'yicha frontendda boshqariladi).
    return Role_Publisher


def _build_agora_token(user: User, room_name: str) -> str:
    if not settings.AGORA_APP_ID:
        raise ValueError("AGORA_APP_ID sozlanmagan.")
    if not settings.AGORA_APP_CERTIFICATE:
        raise ValueError("AGORA_APP_CERTIFICATE sozlanmagan.")

    uid = int(getattr(user, "id", 0) or 0)
    expire_at = int(time.time()) + settings.AGORA_TOKEN_TTL
    role = _agora_role_for(user)

    if RtcTokenBuilder is None:
        try:
            from .agora_fallback import build_token_with_uid as fallback_build_token
        except Exception as exc:
            raise ValueError("agora-token-builder o'rnatilmagan.") from exc
        return fallback_build_token(
            settings.AGORA_APP_ID,
            settings.AGORA_APP_CERTIFICATE,
            room_name,
            uid,
            role,
            expire_at,
        )

    return RtcTokenBuilder.buildTokenWithUid(
        settings.AGORA_APP_ID,
        settings.AGORA_APP_CERTIFICATE,
        room_name,
        uid,
        role,
        expire_at,
    )

def _create_or_reactivate_room(lesson: Lesson):
    room_code = f"lesson_{lesson.id}_{uuid.uuid4().hex[:6]}"
    room, created = LiveRoom.objects.get_or_create(
        lesson=lesson,
        defaults={
            "room_name": room_code,
            "jitsi_url": f"https://meet.jit.si/{room_code}",
            "is_active": True,
            "started_at": timezone.now(),
        },
    )
    if not created:
        changed = False
        if not room.room_name:
            room.room_name = room_code
            changed = True
        if not room.jitsi_url:
            room.jitsi_url = f"https://meet.jit.si/{room.room_name}"
            changed = True
        if not room.is_active:
            room.is_active = True
            room.started_at = timezone.now()
            room.ended_at = None
            changed = True
        if changed:
            room.save()
    return room, created


def _get_or_create_participant(room: LiveRoom, user: User, is_teacher: bool):
    participants = LiveParticipant.objects.filter(room=room, user=user).order_by("-joined_at", "-id")
    participant = participants.first()
    if participant:
        duplicates = participants.exclude(id=participant.id)
        if duplicates.exists():
            duplicates.delete()
        changed = False
        if participant.left_at:
            participant.left_at = None
            changed = True
        if participant.is_teacher != is_teacher:
            participant.is_teacher = is_teacher
            changed = True
        if changed:
            participant.save(update_fields=["left_at", "is_teacher"])
        return participant, False
    return LiveParticipant.objects.create(room=room, user=user, is_teacher=is_teacher), True


class LiveRoomViewSet(viewsets.ModelViewSet):
    queryset = LiveRoom.objects.select_related("lesson", "lesson__teacher_subject__teacher")
    serializer_class = LiveRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        role = getattr(self.request.user, "role", None)
        if role == "teacher":
            qs = qs.filter(lesson__teacher_subject__teacher=self.request.user)
        return qs.order_by("-started_at", "-id")

    def create(self, request, *args, **kwargs):
        lesson_id = request.data.get("lesson") or request.data.get("lesson_id")
        if not lesson_id:
            return Response({"error": "lesson_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        lesson = get_object_or_404(Lesson, id=lesson_id)
        _ensure_teacher_can_access(request, lesson)

        room, created = _create_or_reactivate_room(lesson)
        data = LiveRoomSerializer(room).data
        data["livekit_url"] = _build_ws_url()
        data["token"] = _build_livekit_token(request.user, room.room_name)
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CreateLiveLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lesson_id = request.data.get("lesson") or request.data.get("lesson_id")
        if not lesson_id:
            return Response({"error": "lesson_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        lesson = get_object_or_404(Lesson, id=lesson_id)
        _ensure_teacher_can_access(request, lesson)

        room, _ = _create_or_reactivate_room(lesson)
        return Response(
            {
                "room_id": room.id,
                "room": room.room_name,
                "jitsi_url": room.jitsi_url,
                "livekit_url": _build_ws_url(),
                "token": _build_livekit_token(request.user, room.room_name),
            }
        )


class JoinLiveLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        role = getattr(request.user, "role", None)
        if request.user.is_superuser or role in ["admin", "teacher"]:
            lesson = get_object_or_404(Lesson, id=lesson_id)
            if role == "teacher":
                _ensure_teacher_can_access(request, lesson)
            room, _ = _create_or_reactivate_room(lesson)
        else:
            room = get_object_or_404(LiveRoom, lesson_id=lesson_id, is_active=True)
            _ensure_user_can_join(request, room.lesson)

        _get_or_create_participant(
            room,
            request.user,
            getattr(request.user, "role", None) == "teacher",
        )

        if room.stage_user_id is None and (request.user.is_superuser or role in ["admin", "teacher"]):
            room.stage_user = request.user
            room.save(update_fields=["stage_user"])

        return Response(
            {
                "room_id": room.id,
                "room": room.room_name,
                "jitsi_url": room.jitsi_url,
                "livekit_url": _build_ws_url(),
                "token": _build_livekit_token(request.user, room.room_name),
            }
        )


class JoinLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        room = get_object_or_404(LiveRoom, id=room_id, is_active=True)
        _ensure_user_can_join(request, room.lesson)

        _get_or_create_participant(
            room,
            request.user,
            getattr(request.user, "role", None) == "teacher",
        )

        role = getattr(request.user, "role", None)
        if room.stage_user_id is None and (request.user.is_superuser or role in ["admin", "teacher"]):
            room.stage_user = request.user
            room.save(update_fields=["stage_user"])

        return Response(
            {
                "message": "Joined",
                "room": room.room_name,
                "jitsi_url": room.jitsi_url,
                "livekit_url": _build_ws_url(),
                "token": _build_livekit_token(request.user, room.room_name),
            }
        )


class AgoraTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        lesson_id = request.data.get("lesson_id") or request.data.get("lesson")
        if room_id:
            room = get_object_or_404(LiveRoom, id=room_id, is_active=True)
        elif lesson_id:
            room = get_object_or_404(LiveRoom, lesson_id=lesson_id, is_active=True)
        else:
            return Response(
                {"error": "room_id yoki lesson_id majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _ensure_user_can_join(request, room.lesson)

        try:
            token = _build_agora_token(request.user, room.room_name)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "app_id": settings.AGORA_APP_ID,
                "channel": room.room_name,
                "uid": int(getattr(request.user, "id", 0) or 0),
                "token": token,
                "expires_in": settings.AGORA_TOKEN_TTL,
            }
        )




class LiveRoomStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        room_id = request.query_params.get("room_id")
        lesson_id = request.query_params.get("lesson_id") or request.query_params.get("lesson")
        if room_id:
            room = get_object_or_404(LiveRoom, id=room_id)
        elif lesson_id:
            room = get_object_or_404(LiveRoom, lesson_id=lesson_id)
        else:
            return Response({"error": "room_id yoki lesson_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        _ensure_user_can_join(request, room.lesson)

        participants = (
            LiveParticipant.objects.filter(room=room, left_at__isnull=True)
            .select_related("user")
            .order_by("-joined_at")
        )
        resolved_stage_user_id = room.stage_user_id
        if resolved_stage_user_id is None:
            active_teacher = participants.filter(is_teacher=True).first()
            resolved_stage_user_id = active_teacher.user_id if active_teacher else None

        payload = []
        for p in participants:
            user = p.user
            role = getattr(user, "role", None) or ("admin" if user.is_superuser else "user")
            payload.append(
                {
                    "user_id": user.id,
                    "user_name": user.get_full_name() or user.username,
                    "role": role,
                    "is_teacher": p.is_teacher,
                    "hand_raised": p.hand_raised,
                }
            )

        return Response(
            {
                "room_id": room.id,
                "room": room.room_name,
                "stage_user_id": room.stage_user_id,
                "resolved_stage_user_id": resolved_stage_user_id,
                "allow_ptt": room.allow_ptt,
                "participants": payload,
            }
        )


class RaiseHandView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(LiveRoom, id=room_id)
        _ensure_user_can_join(request, room.lesson)

        participant = LiveParticipant.objects.filter(room=room, user=request.user, left_at__isnull=True).first()
        if not participant:
            return Response({"error": "Ishtirokchi topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        raised = bool(request.data.get("raised", True))
        participant.hand_raised = raised
        participant.save(update_fields=["hand_raised"])
        return Response({"hand_raised": participant.hand_raised})


class SetStageUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        user_id = request.data.get("user_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(LiveRoom, id=room_id)
        _ensure_teacher_can_access(request, room.lesson)

        if not user_id:
            user_id = request.user.id

        participant = (
            LiveParticipant.objects.filter(room=room, user_id=user_id, left_at__isnull=True)
            .select_related("user")
            .first()
        )
        if not participant:
            return Response({"error": "Ishtirokchi topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        room.stage_user_id = participant.user_id
        room.save(update_fields=["stage_user"])

        if participant.hand_raised:
            participant.hand_raised = False
            participant.save(update_fields=["hand_raised"])

        return Response({"stage_user_id": room.stage_user_id})


class PushToTalkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(LiveRoom, id=room_id)
        _ensure_teacher_can_access(request, room.lesson)

        enabled = bool(request.data.get("enabled", False))
        room.allow_ptt = enabled
        room.save(update_fields=["allow_ptt"])
        return Response({"allow_ptt": room.allow_ptt})


class SyncLiveRoomsView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request):
        result = sync_live_rooms()
        return Response(result, status=status.HTTP_200_OK)


class LeaveLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        room = get_object_or_404(LiveRoom, id=room_id)
        participants = LiveParticipant.objects.filter(room=room, user=request.user)
        if not participants.exists():
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        participants.update(left_at=timezone.now(), hand_raised=False)
        if room.stage_user_id == request.user.id:
            next_teacher = (
                LiveParticipant.objects.filter(room=room, is_teacher=True, left_at__isnull=True)
                .exclude(user=request.user)
                .select_related("user")
                .first()
            )
            room.stage_user = next_teacher.user if next_teacher else None
            room.save(update_fields=["stage_user"])
        return Response({"message": "Left room"})


class EndLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"error": "room_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        room = get_object_or_404(LiveRoom, id=room_id)
        _ensure_teacher_can_access(request, room.lesson)
        room.is_active = False
        room.ended_at = timezone.now()
        room.save()
        return Response({"message": "Room ended"})


class LiveParticipantViewSet(viewsets.ModelViewSet):
    queryset = LiveParticipant.objects.select_related("room", "user").order_by("-joined_at")
    serializer_class = LiveParticipantSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class FaceVerificationSettingsView(APIView):
    """Get or update face verification settings."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        settings_obj = FaceVerificationSettings.get_settings()
        serializer = FaceVerificationSettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    def patch(self, request):
        if not (request.user.is_superuser or request.user.role == 'admin'):
            raise PermissionDenied("Only admins can update settings")
        
        settings_obj = FaceVerificationSettings.get_settings()
        serializer = FaceVerificationSettingsSerializer(
            settings_obj, 
            data=request.data, 
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StartFaceVerificationView(APIView):
    """Start face verification session for a participant."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        room_name = request.data.get('room_name')
        if not room_name:
            return Response(
                {"error": "room_name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            room = LiveRoom.objects.get(room_name=room_name)
        except LiveRoom.DoesNotExist:
            return Response(
                {"error": "Room not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Ensure user can join
        try:
            _ensure_user_can_join(request, room.lesson)
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        # Get or create participant
        is_teacher = request.user.role in ['teacher', 'admin'] or request.user.is_superuser
        participant, _ = _get_or_create_participant(room, request.user, is_teacher)
        
        # Get or create session
        session, created = LiveFaceSession.objects.get_or_create(
            participant=participant,
            room=room,
            user=request.user,
            defaults={
                'reference_embedding': request.user.face_embedding,
                'status': 'active',
            }
        )
        
        if not created and session.status == 'ended':
            session.status = 'active'
            session.save()
        
        serializer = LiveFaceSessionSerializer(session)
        return Response({
            "session": serializer.data,
            "created": created,
        })


class AnalyzeFrameView(APIView):
    """Analyze a single frame (for testing/debugging)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from .services import FaceVerificationService
        import base64
        
        frame_data = request.data.get('frame_data')
        if not frame_data:
            return Response(
                {"error": "frame_data is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decode frame
        try:
            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]
            frame_bytes = base64.b64decode(frame_data)
        except Exception:
            return Response(
                {"error": "Invalid frame data"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze with AI
        result = FaceVerificationService._analyze_face_ai(frame_bytes)
        
        if not result:
            return Response(
                {"error": "AI analysis failed"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(result)


class LiveMonitoringView(APIView):
    """Real-time monitoring dashboard for admins/teachers."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        room_name = request.query_params.get('room_name')
        
        if not room_name:
            return Response(
                {"error": "room_name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            room = LiveRoom.objects.select_related('lesson').get(room_name=room_name)
        except LiveRoom.DoesNotExist:
            return Response(
                {"error": "Room not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Permission check
        if not (request.user.is_superuser or request.user.role in ['admin', 'teacher']):
            raise PermissionDenied("Only admins and teachers can access monitoring")
        
        if request.user.role == 'teacher':
            _ensure_teacher_can_access(request, room.lesson)
        
        # Get active sessions
        sessions = LiveFaceSession.objects.filter(
            room=room,
            status='active'
        ).select_related('user').order_by('-last_verification_at')
        
        # Count verified participants
        verified_count = sum(
            1 for s in sessions 
            if s.success_count > 0 and s.success_rate >= 70
        )
        
        # Get recent alerts
        recent_alerts = LiveFaceEvent.objects.filter(
            room=room,
            alert_sent=True
        ).select_related('user').order_by('-created_at')[:20]
        
        data = {
            'room_name': room.room_name,
            'room_id': room.id,
            'lesson_topic': room.lesson.topic if hasattr(room.lesson, 'topic') else 'N/A',
            'is_active': room.is_active,
            'total_participants': sessions.count(),
            'verified_participants': verified_count,
            'sessions': sessions,
            'recent_alerts': recent_alerts,
        }
        
        serializer = LiveMonitoringSerializer(data)
        return Response(serializer.data)


class FaceSessionListView(APIView):
    """List face verification sessions for a room."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        room_name = request.query_params.get('room_name')
        
        if not room_name:
            return Response(
                {"error": "room_name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            room = LiveRoom.objects.get(room_name=room_name)
        except LiveRoom.DoesNotExist:
            return Response(
                {"error": "Room not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        sessions = LiveFaceSession.objects.filter(
            room=room
        ).select_related('user').order_by('-started_at')
        
        serializer = LiveFaceSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class FaceEventListView(APIView):
    """List face verification events for a session or room."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        session_id = request.query_params.get('session_id')
        room_name = request.query_params.get('room_name')
        
        if session_id:
            events = LiveFaceEvent.objects.filter(
                session_id=session_id
            ).order_by('-created_at')
        elif room_name:
            try:
                room = LiveRoom.objects.get(room_name=room_name)
                events = LiveFaceEvent.objects.filter(
                    room=room
                ).order_by('-created_at')[:50]
            except LiveRoom.DoesNotExist:
                return Response(
                    {"error": "Room not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {"error": "session_id or room_name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LiveFaceEventSerializer(events, many=True)
        return Response(serializer.data)



