from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Lesson
from .serializers import LessonSerializer


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student":
            group_id = getattr(user, "group_id", None)
            if group_id:
                qs = qs.filter(group_id=group_id)
            else:
                return qs.none()
        if role == "teacher":
            qs = qs.filter(teacher_subject__teacher=user)
        return qs.order_by("start_time")
