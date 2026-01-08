from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsTeacherOrAdmin

from .models import Timetable, LessonSlot
from .serializers import TimetableSerializer, LessonSlotSerializer


class TeacherAdminWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]


class TimetableViewSet(TeacherAdminWriteViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            qs = qs.filter(group_id=user.group_id)
        if role == "teacher":
            # teacher has slots with teacher fk in LessonSlot
            qs = qs.filter(slots__teacher=user).distinct()
        return qs


class LessonSlotViewSet(TeacherAdminWriteViewSet):
    queryset = LessonSlot.objects.all()
    serializer_class = LessonSlotSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            qs = qs.filter(timetable__group_id=user.group_id)
        if role == "teacher":
            qs = qs.filter(teacher=user)
        return qs
