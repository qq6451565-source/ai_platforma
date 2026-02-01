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

from .models import LiveParticipant, LiveRoom
from .serializers import LiveParticipantSerializer, LiveRoomSerializer

try:
    from agora_token_builder import RtcTokenBuilder, Role_Publisher, Role_Subscriber
except Exception:  # pragma: no cover - optional dependency
    RtcTokenBuilder = None
    Role_Publisher = 1
    Role_Subscriber = 2


def _student_group_id(user: User):
    try:
        return user.student_profile.group_id
    except StudentProfile.DoesNotExist:
        return None


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
    role = getattr(user, "role", None)
    if user.is_superuser or role in ["admin", "teacher"]:
        return Role_Publisher
    return Role_Subscriber


def _build_agora_token(user: User, room_name: str) -> str:
    if not settings.AGORA_APP_ID:
        raise ValueError("AGORA_APP_ID sozlanmagan.")
    if not settings.AGORA_APP_CERTIFICATE:
        raise ValueError("AGORA_APP_CERTIFICATE sozlanmagan.")
    if RtcTokenBuilder is None:
        raise ValueError("agora-token-builder o'rnatilmagan.")

    uid = int(getattr(user, "id", 0) or 0)
    expire_at = int(time.time()) + settings.AGORA_TOKEN_TTL
    role = _agora_role_for(user)
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


class SyncLiveRoomsView(APIView):
    permission_classes = [IsAuthenticated]

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
        participants.update(left_at=timezone.now())
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
