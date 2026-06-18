# Student progress/statistics API
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from student_tests.models import StudentTest
from assignments.models import Assignment, Submission
from attendance.models import Attendance
from gradebook.models import GradebookEntry
from lessons.models import Lesson
from django.db import models

class StudentProgressStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if getattr(user, 'role', None) != 'student':
            return Response({'error': 'Only for students'}, status=403)
        # O'rtacha baho
        grades = GradebookEntry.objects.filter(student=user)
        avg_grade = grades.aggregate(avg=models.Avg("total_score")).get("avg")
        # Test natijalari
        tests = StudentTest.objects.filter(student=user)
        total_tests = tests.count()
        finished_tests = tests.filter(is_finished=True).count()
        avg_test_score = tests.filter(is_finished=True).aggregate(avg=models.Avg('score_percent')).get('avg')
        # Topshiriq foizi
        submissions = Submission.objects.filter(student=user)
        total_assignments = submissions.count()
        completed_assignments = submissions.exclude(grade__isnull=True).count()
        assignment_completion = (completed_assignments / total_assignments * 100) if total_assignments else 0
        # Darsga qatnashish foizi (sinxron live + asinxron video birlashtirilgan)
        from attendance.services import combined_attendance_counts
        att = combined_attendance_counts(student=user)
        total_lessons = att["total"]
        attended = att["attended"]
        attendance_percent = att["attendance_rate"]
        # Missed lessons
        missed = total_lessons - attended
        # Progress grafigi uchun oxirgi 10 dars bo'yicha attendance (live)
        last10 = Attendance.objects.filter(student=user).order_by('-timestamp')[:10]
        last10_stats = [
            {'lesson': getattr(a.lesson, "id", None), 'date': getattr(a, "timestamp", None), 'status': a.status}
            for a in last10
        ]
        return Response({
            'avg_grade': avg_grade,
            'total_tests': total_tests,
            'finished_tests': finished_tests,
            'avg_test_score': avg_test_score,
            'total_assignments': total_assignments,
            'completed_assignments': completed_assignments,
            'assignment_completion_percent': assignment_completion,
            'attendance_percent': attendance_percent,
            'missed_lessons': missed,
            'last10_attendance': last10_stats,
        })
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from student_tests.models import StudentTest
from assignments.models import Assignment
from attendance.models import Attendance
from journal.models import JournalRecord
from gradebook.models import GradebookEntry
from lessons.models import Lesson
from .models import StudentProfile
from .serializers import StudentProfileSerializer
from student_tests.serializers import StudentTestSerializer
from assignments.serializers import AssignmentSerializer
from attendance.serializers import AttendanceSerializer
from journal.serializers import JournalRecordSerializer
from gradebook.serializers import GradebookEntrySerializer
from lessons.serializers import LessonSerializer

# Student dashboard API
class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if getattr(user, 'role', None) != 'student':
            return Response({'error': 'Only for students'}, status=403)
        profile = StudentProfile.objects.filter(user=user).first()
        tests = StudentTest.objects.filter(student=user)
        assignments = Assignment.objects.filter(student=user)
        attendance = Attendance.objects.filter(student=user)
        journals = JournalRecord.objects.filter(student=user)
        grades = GradebookEntry.objects.filter(student=user)
        lessons = Lesson.objects.filter(group=user.group) if user.group else Lesson.objects.none()
        return Response({
            'profile': StudentProfileSerializer(profile).data if profile else None,
            'tests': StudentTestSerializer(tests, many=True).data,
            'assignments': AssignmentSerializer(assignments, many=True).data,
            'attendance': AttendanceSerializer(attendance, many=True).data,
            'journals': JournalRecordSerializer(journals, many=True).data,
            'grades': GradebookEntrySerializer(grades, many=True).data,
            'lessons': LessonSerializer(lessons, many=True).data,
        })
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

from accounts.models import User
from .models import StudentProfile, TeacherProfile
from .serializers import StudentProfileSerializer, TeacherProfileSerializer


class AdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]


class StudentProfileViewSet(AdminOnlyViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer


class TeacherProfileViewSet(AdminOnlyViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer
