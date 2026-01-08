from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import GroupMessage
from .serializers import GroupMessageSerializer


class GroupMessageViewSet(viewsets.ModelViewSet):
    queryset = GroupMessage.objects.all().order_by("-created_at")
    serializer_class = GroupMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student":
            if user.group_id:
                return qs.filter(group_id=user.group_id)
            return qs.none()
        if role == "teacher":
            return qs.filter(group__teachersubject__teacher=user).distinct()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        group = serializer.validated_data.get("group")
        role = getattr(user, "role", None)
        if role == "student":
            if not user.group_id or user.group_id != group.id:
                raise PermissionDenied("Faqat oz guruhingizga yozishingiz mumkin.")
        if role == "teacher":
            if not group or not group.teachersubject_set.filter(teacher=user).exists():
                raise PermissionDenied("Faqat oz guruhlaringizga yozishingiz mumkin.")
        serializer.save(sender=user)

    @action(detail=False, methods=["get"], url_path="history/(?P<group_id>[^/.]+)")
    def get_chat_history(self, request, group_id=None):
        user = request.user
        role = getattr(user, "role", None)
        if role == "student":
            if not user.group_id or str(user.group_id) != str(group_id):
                raise PermissionDenied("Faqat oz guruhingiz tarixini korasiz.")
        if role == "teacher":
            if not user.teachersubject_set.filter(groups__id=group_id).exists():
                raise PermissionDenied("Faqat oz guruhingiz tarixini korasiz.")
        messages = GroupMessage.objects.filter(group_id=group_id).order_by("created_at")
        return Response(GroupMessageSerializer(messages, many=True).data)

    @action(detail=True, methods=["post"])
    def mark_seen(self, request, pk=None):
        message = self.get_object()
        user = request.user
        role = getattr(user, "role", None)
        if role == "student":
            if not user.group_id or message.group_id != user.group_id:
                raise PermissionDenied("Ruxsat yo'q.")
        if role == "teacher":
            if not user.teachersubject_set.filter(groups__id=message.group_id).exists():
                raise PermissionDenied("Ruxsat yo'q.")
        message.is_seen = True
        message.save()
        return Response({"message": "Seen updated!"}, status=status.HTTP_200_OK)
