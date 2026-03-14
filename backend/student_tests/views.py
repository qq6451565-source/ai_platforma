from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Sum
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from tests_app.models import Test, Question, Option
from tests_app.permissions import IsTeacherOrAdmin
from tests_app.serializers import QuestionStudentSerializer
from ai.models import AISettings
from attendance.services import get_lesson_attendance_eligibility
from .models import StudentTest, StudentAnswer
from .serializers import StudentTestSerializer, StudentAnswerSerializer


def _get_next_question(test: Test, index: int):
    qs = test.questions.all().order_by("order")
    if index >= qs.count():
        return None
    return qs[index]


def _ensure_proctor_ok(student_test: StudentTest):
    ai_settings = AISettings.get_active()
    if not ai_settings.proctor_strict:
        return
    session = getattr(student_test, "proctor_session", None)
    if not session:
        raise ValidationError({"detail": "Proktor sessiya topilmadi."})
    if session.blocked:
        raise ValidationError({"detail": "Proktor bloklangan. Davom etish mumkin emas."})
    if not session.verified:
        raise ValidationError({"detail": "Yuz tasdiqlanmagan. Proktor tekshiruvini bajaring."})


class StudentTestAdminViewSet(viewsets.ModelViewSet):
    queryset = StudentTest.objects.select_related(
        "test",
        "test__subject",
        "test__group",
        "test__lesson",
        "test__lesson__teacher_subject",
        "test__lesson__teacher_subject__subject",
        "test__lesson__group",
    )
    serializer_class = StudentTestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacherOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "student":
            return qs.filter(student=user)
        if role == "teacher":
            return qs.filter(
                Q(test__lesson__teacher_subject__teacher=user) |
                Q(test__lesson__isnull=True, test__teacher=user)
            )
        return qs


class StudentAnswerAdminViewSet(viewsets.ModelViewSet):
    queryset = StudentAnswer.objects.all()
    serializer_class = StudentAnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacherOrAdmin()]


class StartStudentTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student test boshlay oladi."})

        test_id = request.data.get("test_id")
        if not test_id:
            raise ValidationError({"test_id": "test_id required"})

        try:
            test = Test.objects.get(id=test_id, is_active=True)
        except Test.DoesNotExist:
            raise NotFound("Test topilmadi yoki active emas.")

        if test.group_id and getattr(request.user, "group_id", None) != test.group_id:
            raise PermissionDenied("Bu test sizning guruhingizga tegishli emas.")
        allowed, reason = get_lesson_attendance_eligibility(request.user, test.lesson_id)
        if not allowed:
            raise ValidationError({"detail": reason})

        student_test, created = StudentTest.objects.get_or_create(
            student=request.user,
            test=test,
            defaults={"current_question_index": 0}
        )

        if student_test.is_finished:
            return Response({
                "detail": "Bu test allaqachon yakunlangan.",
                "student_test_id": student_test.id,
                "score_percent": student_test.score_percent
            }, status=200)

        q = _get_next_question(test, student_test.current_question_index)
        if not q:
            return Response({"detail": "Testda savollar yo‘q."}, status=200)

        return Response({
            "student_test_id": student_test.id,
            "question": QuestionStudentSerializer(q, context={"student_test_id": student_test.id}).data
        }, status=201 if created else 200)


class AnswerStudentTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, student_test_id: int):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student javob yuboradi."})

        try:
            st = StudentTest.objects.select_related("test").get(id=student_test_id, student=request.user)
        except StudentTest.DoesNotExist:
            raise NotFound("StudentTest topilmadi.")

        if st.is_finished:
            return Response({"detail": "Test yakunlangan."}, status=400)

        _ensure_proctor_ok(st)

        question_id = request.data.get("question_id")
        option_id = request.data.get("option_id")
        if not question_id or not option_id:
            raise ValidationError({"detail": "question_id va option_id required"})

        try:
            q = Question.objects.get(id=question_id, test=st.test)
        except Question.DoesNotExist:
            raise NotFound("Savol topilmadi.")

        try:
            opt = Option.objects.get(id=option_id, question=q)
        except Option.DoesNotExist:
            raise NotFound("Option topilmadi.")

        is_correct = bool(opt.is_correct)

        StudentAnswer.objects.update_or_create(
            student_test=st,
            question=q,
            defaults={"selected_option": opt, "is_correct": is_correct}
        )

        # keyingi savolga o'tkazish
        st.current_question_index += 1
        st.save(update_fields=["current_question_index"])

        next_q = _get_next_question(st.test, st.current_question_index)
        if not next_q:
            return Response({"detail": "Savollar tugadi. finish qiling.", "student_test_id": st.id}, status=200)

        return Response({
            "student_test_id": st.id,
            "question": QuestionStudentSerializer(next_q, context={"student_test_id": st.id}).data
        }, status=200)


class FinishStudentTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, student_test_id: int):
        if getattr(request.user, "role", None) != "student":
            raise ValidationError({"detail": "Faqat student finish qila oladi."})

        try:
            st = StudentTest.objects.select_related("test").get(id=student_test_id, student=request.user)
        except StudentTest.DoesNotExist:
            raise NotFound("StudentTest topilmadi.")

        if st.is_finished:
            return Response({
                "detail": "Allaqachon yakunlangan.",
                "score_percent": st.score_percent
            }, status=200)

        total_questions = st.test.questions.count()
        if total_questions == 0:
            st.is_finished = True
            st.finished_at = timezone.now()
            st.score_percent = 0.0
            st.save(update_fields=["is_finished", "finished_at", "score_percent"])
            return Response({"score_percent": 0.0}, status=200)

        total_points = st.test.questions.aggregate(total=Sum("points")).get("total") or 0
        if total_points == 0:
            st.is_finished = True
            st.finished_at = timezone.now()
            st.score_percent = 0.0
            st.save(update_fields=["is_finished", "finished_at", "score_percent"])
            return Response({"score_percent": 0.0}, status=200)

        correct_points = (
            st.answers.filter(is_correct=True).aggregate(total=Sum("question__points")).get("total") or 0
        )
        score = (float(correct_points) / float(total_points)) * 100.0

        st.is_finished = True
        st.finished_at = timezone.now()
        st.score_percent = score

        # Proctoring nisbatini tekshirish
        ratio_threshold = float(getattr(settings, "PROCTOR_MIN_FACE_RATIO", 0.50))
        is_accepted = True
        rejected_reason = ""
        face_ratio = None

        try:
            from proctoring.models import ProctorSession
            proctor_session = (
                ProctorSession.objects
                .filter(student_test=st)
                .order_by("-started_at")
                .first()
            )
            if proctor_session and proctor_session.total_checks > 0:
                face_ratio = proctor_session.face_verified_ratio  # property
                if face_ratio < ratio_threshold:
                    is_accepted = False
                    rejected_reason = (
                        f"Yuz aniqlash nisbati {round(face_ratio * 100)}% — "
                        f"minimal {int(ratio_threshold * 100)}% kerak."
                    )
        except Exception as _exc:
            import logging
            logging.getLogger(__name__).warning("Proctoring session tekshirishda xato: %s", _exc)

        st.is_accepted = is_accepted
        st.rejected_reason = rejected_reason
        if face_ratio is not None:
            st.face_verified_ratio = round(face_ratio, 4)

        st.save(update_fields=[
            "is_finished", "finished_at", "score_percent",
            "is_accepted", "rejected_reason", "face_verified_ratio",
        ])

        return Response({
            "student_test_id": st.id,
            "total_questions": total_questions,
            "correct": st.answers.filter(is_correct=True).count(),
            "score_percent": round(score, 2),
            "is_accepted": is_accepted,
            "rejected_reason": rejected_reason,
            "face_verified_ratio": face_ratio,
        }, status=200)
