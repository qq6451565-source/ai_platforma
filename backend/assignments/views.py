from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from tests_app.permissions import IsAdmin, IsTeacher, IsTeacherOrAdmin

from .models import Assignment, Submission
from .serializers import AssignmentSerializer, SubmissionSerializer


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
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
            if getattr(user, "group_id", None):
                qs = qs.filter(teacher_subject__groups__id=user.group_id).distinct()
        if role == "teacher":
            qs = qs.filter(teacher_subject__teacher=user)
        return qs


class MySubmissionsView(APIView):
    """
    Student uchun: faqat o'z yuborgan submissions.
    Teacher/Admin uchun: hammasi (istasa frontendda filterlab ko'rish).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Submission.objects.select_related("assignment", "student")
        role = getattr(request.user, "role", None)
        if role == "student":
            qs = qs.filter(student=request.user)
        if role == "teacher":
            qs = qs.filter(assignment__teacher_subject__teacher=request.user)
        data = SubmissionSerializer(qs, many=True).data
        return Response(data)


class SubmitAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, "role", None) != "student":
            raise PermissionDenied("Faqat student topshiriq yuboradi.")

        serializer = SubmissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(student=request.user)
            return Response({"message": "Topshiriq topshirildi!", "data": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GradeSubmissionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin baholaydi.")

        try:
            submission = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            raise NotFound("Submission topilmadi")

        grade = request.data.get("grade")
        if grade is not None:
            try:
                grade = float(grade)
            except (TypeError, ValueError):
                raise ValidationError({"grade": "grade raqam bo'lishi kerak."})

        submission.grade = grade
        submission.teacher_comment = request.data.get("teacher_comment", "")
        submission.save()

        return Response({"message": "Baholandi!", "grade": submission.grade})
