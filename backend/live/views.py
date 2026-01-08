from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from tests_app.permissions import IsTeacherOrAdmin, IsAdmin
from .models import LiveRoom, LiveParticipant
from .serializers import LiveRoomSerializer, LiveParticipantSerializer
from lessons.models import Lesson
from accounts.models import User
import uuid

class LiveRoomViewSet(viewsets.ModelViewSet):
    queryset = LiveRoom.objects.all()
    serializer_class = LiveRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def create(self, request):
        lesson_id = request.data.get('lesson_id')
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        room_name = f"lesson_{lesson_id}_{uuid.uuid4().hex[:6]}"
        jitsi_url = f"https://meet.jit.si/{room_name}"
        room = LiveRoom.objects.create(
            lesson=lesson,
            room_name=room_name,
            jitsi_url=jitsi_url,
            is_active=True,
            started_at=timezone.now()
        )
        return Response({
            'room_id': room.id,
            'room_name': room.room_name,
            'jitsi_url': room.jitsi_url,
            'started_at': room.started_at
        }, status=201)

class JoinLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        room_id = request.data.get('room_id')
        try:
            room = LiveRoom.objects.get(id=room_id, is_active=True)
        except LiveRoom.DoesNotExist:
            return Response({'error': 'Room not found or not active'}, status=404)
        participant, created = LiveParticipant.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'is_teacher': request.user.role == 'teacher'}
        )
        return Response({'message': 'Joined', 'room': room.room_name, 'jitsi_url': room.jitsi_url})

class LeaveLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        room_id = request.data.get('room_id')
        try:
            room = LiveRoom.objects.get(id=room_id)
            participant = LiveParticipant.objects.get(room=room, user=request.user)
        except (LiveRoom.DoesNotExist, LiveParticipant.DoesNotExist):
            return Response({'error': 'Not found'}, status=404)
        participant.left_at = timezone.now()
        participant.save()
        return Response({'message': 'Left room'})

class EndLiveRoomView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        room_id = request.data.get('room_id')
        try:
            room = LiveRoom.objects.get(id=room_id)
        except LiveRoom.DoesNotExist:
            return Response({'error': 'Room not found'}, status=404)
        if request.user.role != 'teacher':
            return Response({'error': 'Only teacher can end room'}, status=403)
        room.is_active = False
        room.ended_at = timezone.now()
        room.save()
        return Response({'message': 'Room ended'})
import uuid

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import LiveRoom


class CreateLiveLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin live yaratadi.")

        lesson_id = request.data.get("lesson")

        room = f"lesson_{lesson_id}_{uuid.uuid4().hex[:6]}"

        live = LiveRoom.objects.create(
            lesson_id=lesson_id,
            room_name=room,
        )

        return Response({
            "room": live.room_name,
            "ws_url": f"ws://127.0.0.1:8000/ws/live/{live.room_name}/",
        })


class JoinLiveLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        try:
            live = LiveRoom.objects.get(lesson_id=lesson_id)
        except LiveRoom.DoesNotExist:
            return Response({"error": "Bu dars uchun live room yaratilmagan"}, status=404)

        return Response({
            "room": live.room_name,
            "ws_url": f"ws://127.0.0.1:8000/ws/live/{live.room_name}/",
        })
class LiveParticipantViewSet(viewsets.ModelViewSet):
    queryset = LiveParticipant.objects.select_related("room", "user").order_by("-joined_at")
    serializer_class = LiveParticipantSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
