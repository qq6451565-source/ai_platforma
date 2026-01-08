from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Attendance
from .serializers import AttendanceSerializer


class MarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin davomat belgilaydi.")

        serializer = AttendanceSerializer(data=request.data)
        if serializer.is_valid():
            lesson = serializer.validated_data["lesson"]
            student = serializer.validated_data["student"]

            obj, created = Attendance.objects.update_or_create(
                lesson=lesson,
                student=student,
                defaults={"status": serializer.validated_data["status"]},
            )

            return Response({
                "message": "Davomat saqlandi",
                "attendance_id": obj.id,
                "status": obj.status,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LessonAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin ko'ra oladi.")

        records = Attendance.objects.filter(lesson_id=lesson_id)
        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)


class StudentAttendanceHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        role = getattr(request.user, "role", None)
        if role == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz davomingizni ko'ra olasiz.")
        if not (request.user.is_superuser or role in ["student", "teacher", "admin"]):
            raise PermissionDenied("Ruxsat yo'q.")

        records = Attendance.objects.filter(student_id=student_id)
        serializer = AttendanceSerializer(records, many=True)
        return Response(serializer.data)
