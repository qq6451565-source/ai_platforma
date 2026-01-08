from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from tests_app.permissions import IsAdmin, IsTeacher, IsTeacherOrAdmin

from .models import JournalRecord
from .serializers import JournalRecordSerializer
from lessons.models import Lesson
from accounts.models import User


class JournalRecordViewSet(viewsets.ModelViewSet):
    queryset = JournalRecord.objects.all()
    serializer_class = JournalRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacherOrAdmin()]

    def perform_create(self, serializer):
        # Agar group kelmasa, darsdan o'zimiz olib qo'yamiz
        lesson = serializer.validated_data.get("lesson")
        group = serializer.validated_data.get("group") or (lesson.group if lesson else None)
        serializer.save(group=group)


class JournalLessonStudentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin ko'ra oladi.")

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"error": "Dars topilmadi"}, status=404)

        group = lesson.group
        students = User.objects.filter(group=group, role="student").values("id", "username")

        return Response({
            "lesson": lesson.topic,
            "group": group.name,
            "students": list(students),
        })


class JournalMarkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin baho qo'yadi.")

        serializer = JournalRecordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Jurnal yozuvi saqlandi", "data": serializer.data})
        return Response(serializer.errors, status=400)


class GetStudentJournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        role = getattr(request.user, "role", None)
        if role == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz jurnalizni ko'ra olasiz.")
        if not (request.user.is_superuser or role in ["student", "teacher", "admin"]):
            raise PermissionDenied("Ruxsat yo'q.")

        records = JournalRecord.objects.filter(student_id=student_id)
        serializer = JournalRecordSerializer(records, many=True)
        return Response(serializer.data)
