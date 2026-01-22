from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from .models import Subject
from .serializers import SubjectSerializer


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Yaratish/tahrirlash faqat admin
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        # O'qish (GET) hamma authenticated (student/teacher) uchun ruxsat
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student" and getattr(user, "group_id", None):
            group = user.group
            if group:
                qs = qs.filter(directions=group.direction)
            else:
                qs = qs.none()
        if role == "teacher":
            qs = qs.filter(teachersubject__teacher=user).distinct()
        return qs
