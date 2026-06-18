from django.http import HttpResponse
from django.utils import timezone
from django.db import models
from reportlab.pdfgen import canvas

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from accounts.models import User
from groups.models import Group
from student_tests.models import StudentTest
from attendance.services import combined_attendance_counts
from assignments.models import Assignment, Submission
from teacher_subject.models import TeacherSubject
from lessons.models import Lesson
from tests_app.models import Test
from gradebook.models import GradebookEntry


class ExportGradebookPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="gradebook.pdf"'
        p = canvas.Canvas(response)
        p.drawString(100, 800, "Gradebook Export")
        y = 780
        for entry in GradebookEntry.objects.all()[:100]:
            p.drawString(100, y, f"{entry.student.username} | {entry.subject.name} | {entry.total_score}")
            y -= 20
            if y < 50:
                p.showPage()
                y = 800
        p.save()
        return response


class StudentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        if getattr(request.user, "role", None) == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz profilingizni ko'ra olasiz.")

        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response({"error": "Bunday student topilmadi"}, status=404)

        tests = StudentTest.objects.filter(student=student)
        total_tests = tests.count()
        avg_score = tests.aggregate(avg=models.Avg("score_percent"))["avg"] or 0

        # Sinxron (live) + asinxron (video) birlashtirilgan davomat
        att = combined_attendance_counts(student=student)
        attendance_rate = att["attendance_rate"]

        submissions = Submission.objects.filter(student=student)
        submitted = submissions.count()
        all_assignments = Assignment.objects.all().count()
        submit_rate = (submitted / all_assignments * 100) if all_assignments else 0

        return Response({
            "student_id": student.id,
            "student_username": student.username,
            "avg_score": round(avg_score, 2),
            "total_tests": total_tests,
            "attendance_rate": round(attendance_rate, 2),
            "attendance_breakdown": {
                "live_total": att["live_total"],
                "live_present": att["live_present"],
                "video_total": att["video_total"],
                "video_completed": att["video_completed"],
            },
            "submitted_assignments": submitted,
            "assignment_submit_rate": round(submit_rate, 2),
        })


class TeacherStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        role = getattr(request.user, "role", None)
        if role == "student":
            raise PermissionDenied("Faqat teacher yoki admin ko'ra oladi.")
        if role == "teacher" and request.user.id != teacher_id:
            raise PermissionDenied("Faqat oz profilingizni ko'ra olasiz.")

        try:
            teacher = User.objects.get(id=teacher_id, role="teacher")
        except User.DoesNotExist:
            return Response({"error": "Bunday oqituvchi topilmadi"}, status=404)

        teacher_subjects = TeacherSubject.objects.filter(teacher=teacher)
        total_subjects = teacher_subjects.count()

        lessons_count = Lesson.objects.filter(
            teacher_subject__teacher=teacher,
        ).count()

        assignments_count = Assignment.objects.filter(
            teacher_subject__teacher=teacher,
        ).count()

        tests_count = Test.objects.filter(
            teacher_subject__teacher=teacher,
        ).count()

        return Response({
            "teacher_id": teacher.id,
            "teacher_username": teacher.username,
            "subjects_count": total_subjects,
            "lessons_count": lessons_count,
            "assignments_count": assignments_count,
            "tests_count": tests_count,
        })


class GroupStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        if not (request.user.is_superuser or getattr(request.user, "role", None) in ["teacher", "admin"]):
            raise PermissionDenied("Faqat teacher yoki admin ko'ra oladi.")

        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({"error": "Guruh topilmadi"}, status=404)

        students = group.students.all()
        total_students = students.count()

        # Sinxron + asinxron birlashtirilgan guruh davomati
        student_ids = list(students.values_list("id", flat=True))
        att = combined_attendance_counts(student_ids=student_ids)
        attendance_rate = att["attendance_rate"]

        tests = StudentTest.objects.filter(student__in=students)
        avg_score = tests.aggregate(avg=models.Avg("score_percent"))["avg"] or 0

        return Response({
            "group_id": group.id,
            "group_name": group.name,
            "total_students": total_students,
            "attendance_rate": round(attendance_rate, 2),
            "attendance_breakdown": {
                "live_total": att["live_total"],
                "live_present": att["live_present"],
                "video_total": att["video_total"],
                "video_completed": att["video_completed"],
            },
            "avg_test_score": round(avg_score, 2),
        })


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        if getattr(request.user, "role", None) == "student" and request.user.id != student_id:
            raise PermissionDenied("Faqat oz profilingizni ko'ra olasiz.")

        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response({"error": "Student topilmadi"}, status=404)

        now = timezone.now()

        tests = StudentTest.objects.filter(student=student)
        total_tests = tests.count()
        avg_score = tests.aggregate(avg=models.Avg("score_percent"))["avg"] or 0

        attendance_rate = combined_attendance_counts(student=student)["attendance_rate"]

        upcoming_lessons = []
        if student.group:
            lessons = Lesson.objects.filter(
                group=student.group,
                start_time__gte=now,
            ).order_by("start_time")[:5]

            for l in lessons:
                upcoming_lessons.append({
                    "id": l.id,
                    "topic": l.topic,
                    "start_time": l.start_time,
                    "end_time": l.end_time,
                    "teacher": l.teacher_subject.teacher.username,
                    "subject": l.teacher_subject.subject.name,
                })

        upcoming_tests = []
        if student.group:
            group_ts = TeacherSubject.objects.filter(groups=student.group)
            tests_qs = Test.objects.filter(
                teacher_subject__in=group_ts,
            ).order_by("-id")[:5]

            for t in tests_qs:
                upcoming_tests.append({
                    "id": t.id,
                    "title": t.title,
                    "duration": t.duration,
                    "teacher": t.teacher_subject.teacher.username,
                    "subject": t.teacher_subject.subject.name,
                })

        active_assignments = []
        if student.group:
            group_ts = TeacherSubject.objects.filter(groups=student.group)
            assignments = Assignment.objects.filter(
                teacher_subject__in=group_ts,
                deadline__gte=now,
            ).order_by("deadline")[:5]

            for a in assignments:
                active_assignments.append({
                    "id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "deadline": a.deadline,
                    "teacher": a.teacher_subject.teacher.username,
                    "subject": a.teacher_subject.subject.name,
                })

        return Response({
            "student": {
                "id": student.id,
                "username": student.username,
                "group": student.group.name if student.group else None,
            },
            "stats": {
                "avg_score": round(avg_score, 2),
                "total_tests": total_tests,
                "attendance_rate": round(attendance_rate, 2),
            },
            "upcoming_lessons": upcoming_lessons,
            "upcoming_tests": upcoming_tests,
            "active_assignments": active_assignments,
        })


class TeacherDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        role = getattr(request.user, "role", None)
        if role == "student":
            raise PermissionDenied("Faqat teacher yoki admin ko'ra oladi.")
        if role == "teacher" and request.user.id != teacher_id:
            raise PermissionDenied("Faqat oz profilingizni ko'ra olasiz.")

        try:
            teacher = User.objects.get(id=teacher_id, role="teacher")
        except User.DoesNotExist:
            return Response({"error": "Oqituvchi topilmadi"}, status=404)

        now = timezone.now()
        today = now.date()

        teacher_subjects = TeacherSubject.objects.filter(teacher=teacher)

        subjects_list = []
        for ts in teacher_subjects:
            subjects_list.append({
                "id": ts.id,
                "subject": ts.subject.name,
                "groups": [g.name for g in ts.groups.all()],
            })

        today_lessons_data = []
        today_lessons = Lesson.objects.filter(
            teacher_subject__teacher=teacher,
            start_time__date=today,
        ).order_by("start_time")

        for l in today_lessons:
            today_lessons_data.append({
                "id": l.id,
                "topic": l.topic,
                "group": l.group.name,
                "start_time": l.start_time,
                "end_time": l.end_time,
                "subject": l.teacher_subject.subject.name,
            })

        recent_tests = []
        tests_qs = Test.objects.filter(
            teacher_subject__teacher=teacher,
        ).order_by("-id")[:5]

        for t in tests_qs:
            recent_tests.append({
                "id": t.id,
                "title": t.title,
                "duration": t.duration,
                "subject": t.teacher_subject.subject.name,
            })

        recent_assignments = []
        assignments_qs = Assignment.objects.filter(
            teacher_subject__teacher=teacher,
        ).order_by("-id")[:5]

        for a in assignments_qs:
            recent_assignments.append({
                "id": a.id,
                "title": a.title,
                "deadline": a.deadline,
                "subject": a.teacher_subject.subject.name,
            })

        return Response({
            "teacher": {
                "id": teacher.id,
                "username": teacher.username,
            },
            "subjects": subjects_list,
            "today_lessons": today_lessons_data,
            "recent_tests": recent_tests,
            "recent_assignments": recent_assignments,
        })


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_superuser or getattr(request.user, "role", None) == "admin"):
            raise PermissionDenied("Faqat admin ko'ra oladi.")

        now = timezone.now()
        today = now.date()

        total_users = User.objects.count()
        total_students = User.objects.filter(role="student").count()
        total_teachers = User.objects.filter(role="teacher").count()
        total_admins = User.objects.filter(role="admin").count()

        total_groups = Group.objects.count()
        total_teacher_subjects = TeacherSubject.objects.count()
        total_lessons = Lesson.objects.count()
        total_tests = Test.objects.count()
        total_assignments = Assignment.objects.count()

        today_lessons = Lesson.objects.filter(start_time__date=today).count()
        today_tests = Test.objects.filter(
            studenttest__started_at__date=today,
        ).distinct().count()

        return Response({
            "users": {
                "total": total_users,
                "students": total_students,
                "teachers": total_teachers,
                "admins": total_admins,
            },
            "groups": total_groups,
            "teacher_subject_links": total_teacher_subjects,
            "lessons_total": total_lessons,
            "tests_total": total_tests,
            "assignments_total": total_assignments,
            "today": {
                "lessons": today_lessons,
                "tests": today_tests,
            },
        })
