import os
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q

from .models import Test, Question, Option
from .serializers import (
    TestStudentSerializer,
    TestTeacherSerializer,
    QuestionAdminSerializer,
    OptionAdminSerializer,
)
from .permissions import IsTeacherOrAdmin, IsAdmin
from lessons.models import Lesson
from .word_import import extract_lines, parse_questions
from attendance.services import get_lesson_access_snapshots


class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.all().select_related(
        "subject",
        "group",
        "teacher",
        "lesson",
        "lesson__teacher_subject",
        "lesson__teacher_subject__subject",
        "lesson__group",
    )

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        # teacher/admin - full create/edit
        if self.action in ["create", "update", "partial_update"]:
            return TestTeacherSerializer
        if self.action == "retrieve":
            user = getattr(self.request, "user", None)
            if getattr(user, "role", None) in ["teacher", "admin"]:
                return TestTeacherSerializer
        return TestStudentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if self.action == "list" and getattr(user, "role", None) == "student":
            lesson_ids = self.filter_queryset(self.get_queryset()).values_list("lesson_id", flat=True)
            context["lesson_access_snapshots"] = get_lesson_access_snapshots(user, lesson_ids)
        return context

    def get_queryset(self):
        qs = super().get_queryset()

        user = self.request.user
        # Student -> faqat o'z guruhiga mos testlar
        if getattr(user, "role", None) == "student":
            group_id = getattr(user, "group_id", None)
            if not group_id:
                group_id = self.request.query_params.get("group_id")
            if not group_id:
                return qs.none()
            lesson_id = self.request.query_params.get("lesson_id")
            if lesson_id:
                try:
                    Lesson.objects.get(id=lesson_id)
                except Lesson.DoesNotExist:
                    return qs.none()
                qs = qs.filter(lesson_id=lesson_id, is_active=True, group_id=group_id)
            else:
                qs = qs.filter(group_id=group_id, is_active=True)

        # Teacher -> o'zi yaratganlari yoki o'zi groupiga biriktirilganlari
        if getattr(user, "role", None) == "teacher":
            qs = qs.filter(Q(lesson__teacher_subject__teacher=user) | Q(lesson__isnull=True, teacher=user))

        return qs
class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.select_related("test").order_by("id")
    serializer_class = QuestionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.select_related("question", "question__test").order_by("id")
    serializer_class = OptionAdminSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class TestUploadView(APIView):
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded = request.FILES.get("file")
        if not uploaded:
            raise ValidationError({"file": "Fayl majburiy."})

        lesson_id = request.data.get("lesson")
        if not lesson_id:
            raise ValidationError({"lesson": "Dars majburiy."})

        title = request.data.get("title") or os.path.splitext(uploaded.name)[0]
        time_limit = request.data.get("time_limit_minutes")
        total_score = request.data.get("total_score")
        is_active_raw = request.data.get("is_active", "true")
        is_active = str(is_active_raw).lower() in ["1", "true", "yes", "on"]

        if total_score is None:
            raise ValidationError({"total_score": "Umumiy ball majburiy."})

        try:
            time_limit_val = int(time_limit) if time_limit is not None else 20
            total_score_val = Decimal(str(total_score))
        except (TypeError, ValueError, InvalidOperation):
            raise ValidationError({"detail": "Vaqt va umumiy ball raqam bo'lishi kerak."})

        lines = extract_lines(uploaded)
        questions = parse_questions(lines)

        payload = {
            "title": title,
            "lesson": lesson_id,
            "time_limit_minutes": time_limit_val,
            "total_score": total_score_val,
            "is_active": is_active,
            "questions": questions,
        }

        serializer = TestTeacherSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        test = serializer.save()
        return Response(TestTeacherSerializer(test).data, status=201)
