from django.db import models
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsTeacherOrAdmin

from .models import Material
from .serializers import MaterialSerializer


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all().order_by("-created_at")
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        lesson_id = self.request.query_params.get("lesson_id")
        subject_id = self.request.query_params.get("subject_id")
        group_id = self.request.query_params.get("group_id")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        # Student: faqat o'z guruhidagi materiallar
        if role == "student" and getattr(user, "group_id", None):
            qs = qs.filter(models.Q(groups__id=user.group_id) | models.Q(group_id=user.group_id))
        # Teacher: o'zi yuklaganlari
        if role == "teacher":
            qs = qs.filter(teacher=user)
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        if group_id:
            qs = qs.filter(models.Q(groups__id=group_id) | models.Q(group_id=group_id))
        return qs.distinct()
