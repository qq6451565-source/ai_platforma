from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin, IsTeacherOrAdmin

from .models import TeacherSubject
from .serializers import TeacherSubjectSerializer


class TeacherSubjectViewSet(viewsets.ModelViewSet):
    queryset = TeacherSubject.objects.all()
    serializer_class = TeacherSubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # faqat admin create/update/delete
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsTeacherOrAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "teacher":
            qs = qs.filter(teacher=user)
        return qs
