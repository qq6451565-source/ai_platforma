from django.utils import timezone
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound

from tests_app.models import Test, Question, Option
from tests_app.permissions import IsTeacherOrAdmin
from tests_app.serializers import QuestionStudentSerializer
from .models import StudentTest, StudentAnswer
from .serializers import StudentTestSerializer, StudentAnswerSerializer


def _get_next_question(test: Test, index: int):
    qs = test.questions.all().order_by("order")
    if index >= qs.count():
        return None
    return qs[index]


class StudentTestAdminViewSet(viewsets.ModelViewSet):
    queryset = StudentTest.objects.all()
    serializer_class = StudentTestSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacherOrAdmin()]


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
            "question": QuestionStudentSerializer(q).data
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
            "question": QuestionStudentSerializer(next_q).data
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

        total = st.test.questions.count()
        if total == 0:
            st.is_finished = True
            st.finished_at = timezone.now()
            st.score_percent = 0.0
            st.save(update_fields=["is_finished", "finished_at", "score_percent"])
            return Response({"score_percent": 0.0, "passed": False}, status=200)

        correct = st.answers.filter(is_correct=True).count()
        score = (correct / total) * 100.0

        st.is_finished = True
        st.finished_at = timezone.now()
        st.score_percent = score
        st.save(update_fields=["is_finished", "finished_at", "score_percent"])

        passed = score >= st.test.pass_score
        return Response({
            "student_test_id": st.id,
            "total_questions": total,
            "correct": correct,
            "score_percent": round(score, 2),
            "passed": passed
        }, status=200)
