from rest_framework import viewsets

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound

from tests_app.permissions import IsAdmin, IsTeacherOrAdmin

from .models import ExamType, Exam, ExamAttempt
from .serializers import ExamTypeSerializer, ExamSerializer, ExamAttemptSerializer


class AdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]


class TeacherAdminWriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]


class TeacherAdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacherOrAdmin()]


class ExamTypeViewSet(AdminOnlyViewSet):
    queryset = ExamType.objects.all()
    serializer_class = ExamTypeSerializer


class ExamViewSet(TeacherAdminWriteViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer


class ExamAttemptViewSet(TeacherAdminOnlyViewSet):
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptSerializer


class StartExamAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, exam_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student exam boshlay oladi."})

        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            raise NotFound("Exam topilmadi.")

        now = timezone.now()
        if exam.starts_at and now < exam.starts_at:
            raise ValidationError({"detail": "Exam hali boshlanmagan."})
        if exam.ends_at and now > exam.ends_at:
            raise ValidationError({"detail": "Exam vaqti tugagan."})

        attempts_used = ExamAttempt.objects.filter(exam=exam, student=request.user).count()
        if attempts_used >= exam.attempts:
            raise ValidationError({"detail": "Urinishlar tugagan."})

        attempt = ExamAttempt.objects.create(
            exam=exam,
            student=request.user,
            attempt_no=attempts_used + 1,
        )

        return Response(
            {
                "attempt_id": attempt.id,
                "attempt_no": attempt.attempt_no,
                "exam_id": exam.id,
                "duration_minutes": exam.duration_minutes,
            },
            status=status.HTTP_201_CREATED,
        )


class FinishExamAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student examni yakunlay oladi."})

        try:
            attempt = ExamAttempt.objects.get(id=attempt_id, student=request.user)
        except ExamAttempt.DoesNotExist:
            raise NotFound("Attempt topilmadi.")

        if attempt.status == "finished":
            return Response({"detail": "Attempt allaqachon yakunlangan."}, status=status.HTTP_200_OK)

        score = request.data.get("score_percent")
        if score is None:
            raise ValidationError({"score_percent": "score_percent required"})
        try:
            score = float(score)
        except (TypeError, ValueError):
            raise ValidationError({"score_percent": "score_percent raqam bo'lishi kerak."})

        if score < 0 or score > 100:
            raise ValidationError({"score_percent": "score_percent 0..100 oralig'ida bo'lishi kerak."})

        attempt.score_percent = score
        attempt.status = "finished"
        attempt.finished_at = timezone.now()
        attempt.save(update_fields=["score_percent", "status", "finished_at"])

        return Response(
            {
                "attempt_id": attempt.id,
                "score_percent": attempt.score_percent,
                "status": attempt.status,
            },
            status=status.HTTP_200_OK,
        )
