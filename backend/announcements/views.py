from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from tests_app.permissions import IsTeacher, IsAdmin, IsTeacherOrAdmin

from .models import Announcement
from .serializers import AnnouncementSerializer
from teacher_subject.models import TeacherSubject


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user

        if user.is_superuser or getattr(user, "role", None) == "admin":
            return serializer.save(creator=user)

        if getattr(user, "role", None) == "teacher":
            subject = serializer.validated_data.get("subject")

            if not TeacherSubject.objects.filter(
                teacher=user,
                subject=subject,
            ).exists():
                raise PermissionDenied("Siz bu fan bo'yicha elon yaratolmaysiz.")

            return serializer.save(creator=user)

        raise PermissionDenied("Faqat admin yoki oqituvchi elon qila oladi.")

    def get_queryset(self):
        qs = super().get_queryset().order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            qs = qs.filter(group_id=user.group_id)
        if role == "teacher":
            group_ids = user.teachersubject_set.values_list("groups__id", flat=True)
            qs = qs.filter(Q(creator=user) | Q(group_id__in=group_ids))
        return qs.distinct()
