from __future__ import annotations

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from attendance.models import Attendance
from attendance.services import (
    DEFAULT_ABSENT_REASON,
    DEFAULT_MISSING_ATTENDANCE_REASON,
    DEFAULT_PENDING_REASON,
    build_lesson_access_snapshot,
)
from assignments.views import SubmitAssignmentView
from core.test_support import AcademicFixtureMixin
from student_tests.views import StartStudentTestView


@override_settings(
    FACE_ATTENDANCE_MIN_SAMPLES=3,
    FACE_ATTENDANCE_PRESENT_RATIO=0.60,
    LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.70,
)
class AttendanceServiceTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()

    def test_finalize_marks_present_when_thresholds_are_met(self) -> None:
        attendance = Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="absent",
            face_check_count=4,
            face_success_count=3,
            joined_seconds=80 * 60,
        )

        attendance.finalize(
            ratio_threshold=0.60,
            duration_ratio_threshold=0.70,
            minimum_face_checks=3,
        )
        attendance.refresh_from_db()

        self.assertTrue(attendance.finalized)
        self.assertEqual(attendance.status, "present")
        self.assertEqual(attendance.face_verified_ratio, 0.75)
        self.assertEqual(attendance.joined_ratio, 0.8)
        self.assertIsNotNone(attendance.finalized_at)

    def test_finalize_marks_absent_when_face_samples_are_insufficient(self) -> None:
        attendance = Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            face_check_count=2,
            face_success_count=2,
            joined_seconds=90 * 60,
        )

        attendance.finalize(
            ratio_threshold=0.60,
            duration_ratio_threshold=0.70,
            minimum_face_checks=3,
        )
        attendance.refresh_from_db()

        self.assertTrue(attendance.finalized)
        self.assertEqual(attendance.status, "absent")
        self.assertEqual(attendance.face_verified_ratio, 1.0)
        self.assertEqual(attendance.joined_ratio, 0.9)

    def test_build_lesson_access_snapshot_only_opens_for_finalized_present_attendance(self) -> None:
        missing_snapshot = build_lesson_access_snapshot(None)
        self.assertFalse(missing_snapshot["allowed"])
        self.assertEqual(missing_snapshot["status"], "blocked_no_attendance")
        self.assertEqual(missing_snapshot["reason"], DEFAULT_MISSING_ATTENDANCE_REASON)

        attendance = Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            finalized=False,
            face_check_count=4,
            face_success_count=3,
            face_verified_ratio=0.75,
            joined_seconds=80 * 60,
            joined_ratio=0.8,
        )

        pending_snapshot = build_lesson_access_snapshot(attendance)
        self.assertFalse(pending_snapshot["allowed"])
        self.assertEqual(pending_snapshot["status"], "pending_attendance")
        self.assertEqual(pending_snapshot["reason"], DEFAULT_PENDING_REASON)

        attendance.finalized = True
        attendance.finalized_at = timezone.now()
        attendance.save(update_fields=["finalized", "finalized_at"])

        open_snapshot = build_lesson_access_snapshot(attendance)
        self.assertTrue(open_snapshot["allowed"])
        self.assertEqual(open_snapshot["status"], "open")
        self.assertIsNone(open_snapshot["reason"])

        attendance.status = "absent"
        attendance.save(update_fields=["status"])

        blocked_snapshot = build_lesson_access_snapshot(attendance)
        self.assertFalse(blocked_snapshot["allowed"])
        self.assertEqual(blocked_snapshot["status"], "blocked_absent")
        self.assertEqual(blocked_snapshot["reason"], DEFAULT_ABSENT_REASON)


@override_settings(
    FACE_ATTENDANCE_MIN_SAMPLES=3,
    FACE_ATTENDANCE_PRESENT_RATIO=0.60,
    LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.70,
)
class AttendanceAccessApiTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()
        self.factory = APIRequestFactory()
        self.start_view = StartStudentTestView.as_view()
        self.submit_view = SubmitAssignmentView.as_view()
        self.lesson_test = self.create_lesson_test()
        self.assignment = self.create_assignment()

    def test_start_student_test_blocks_until_attendance_is_finalized(self) -> None:
        Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            finalized=False,
            face_check_count=4,
            face_success_count=3,
            face_verified_ratio=0.75,
            joined_seconds=80 * 60,
            joined_ratio=0.8,
        )

        request = self.factory.post(
            "/api/student-tests/start/",
            {"test_id": self.lesson_test.id},
            format="json",
        )
        force_authenticate(request, user=self.student)
        response = self.start_view(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["detail"]), DEFAULT_PENDING_REASON)

    def test_start_student_test_allows_finalized_present_attendance(self) -> None:
        Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            finalized=True,
            finalized_at=timezone.now(),
            face_check_count=4,
            face_success_count=3,
            face_verified_ratio=0.75,
            joined_seconds=80 * 60,
            joined_ratio=0.8,
        )

        request = self.factory.post(
            "/api/student-tests/start/",
            {"test_id": self.lesson_test.id},
            format="json",
        )
        force_authenticate(request, user=self.student)
        response = self.start_view(request)

        self.assertEqual(response.status_code, 201)
        self.assertIn("student_test_id", response.data)
        self.assertEqual(response.data["question"]["text"], "DFS nimani anglatadi?")

    def test_submit_assignment_blocks_absent_students(self) -> None:
        Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="absent",
            finalized=True,
            finalized_at=timezone.now(),
            face_check_count=4,
            face_success_count=1,
            face_verified_ratio=0.25,
            joined_seconds=80 * 60,
            joined_ratio=0.8,
        )

        request = self.factory.post(
            "/api/assignments/submit/",
            {
                "assignment": self.assignment.id,
                "comment": "Homework",
                "file": SimpleUploadedFile("homework.txt", b"solution", content_type="text/plain"),
            },
            format="multipart",
        )
        force_authenticate(request, user=self.student)
        response = self.submit_view(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(str(response.data["detail"]), DEFAULT_ABSENT_REASON)

    def test_submit_assignment_allows_finalized_present_students(self) -> None:
        Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            finalized=True,
            finalized_at=timezone.now(),
            face_check_count=4,
            face_success_count=3,
            face_verified_ratio=0.75,
            joined_seconds=80 * 60,
            joined_ratio=0.8,
        )

        request = self.factory.post(
            "/api/assignments/submit/",
            {
                "assignment": self.assignment.id,
                "comment": "Homework",
                "file": SimpleUploadedFile("homework.txt", b"solution", content_type="text/plain"),
            },
            format="multipart",
        )
        force_authenticate(request, user=self.student)
        response = self.submit_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Topshiriq topshirildi!")
        self.assertEqual(response.data["data"]["assignment"], self.assignment.id)
