from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import Test, Question, Option
from .serializers import (
    TestStudentSerializer,
    TestTeacherSerializer,
    QuestionAdminSerializer,
    OptionAdminSerializer,
)
from .permissions import IsTeacherOrAdmin, IsAdmin


class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.all().select_related("subject", "group", "teacher")

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        # teacher/admin - full create/edit
        if self.action in ["create", "update", "partial_update"]:
            return TestTeacherSerializer
        return TestStudentSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        user = self.request.user
        # Student -> faqat o'z guruhiga mos testlar
        if getattr(user, "role", None) == "student":
            group_id = getattr(user, "group_id", None)  # sizda User modelda group bo'lishi mumkin
            if not group_id:
                group_id = self.request.query_params.get("group_id")
            if not group_id:
                return qs.none()
            qs = qs.filter(group_id=group_id, is_active=True)

        # Teacher -> o'zi yaratganlari yoki o'zi groupiga biriktirilganlari
        if getattr(user, "role", None) == "teacher":
            qs = qs.filter(teacher=user)

        return qs
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("test").order_by("id")
    serializer_class = QuestionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.select_related("question", "question__test").order_by("id")
    serializer_class = OptionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
