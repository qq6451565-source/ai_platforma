from __future__ import annotations

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from attendance.models import Attendance, AttendanceOverrideLog
from attendance.services import (
    DEFAULT_ABSENT_REASON,
    DEFAULT_MISSING_ATTENDANCE_REASON,
    DEFAULT_PENDING_REASON,
    build_lesson_access_snapshot,
)
from attendance.views import AttendanceOverrideHistoryView, MarkAttendanceView
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


class AttendanceOverrideApiTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()
        self.factory = APIRequestFactory()
        self.mark_view = MarkAttendanceView.as_view()
        self.history_view = AttendanceOverrideHistoryView.as_view()
        self.other_teacher = self.teacher.__class__.objects.create_user(
            username="other_teacher",
            password="secret",
            role="teacher",
            first_name="Other",
            last_name="Teacher",
        )

    def test_mark_attendance_creates_manual_override_and_audit_log(self) -> None:
        attendance = Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="absent",
            finalized=False,
            face_check_count=2,
            face_success_count=1,
            joined_seconds=10 * 60,
            joined_ratio=0.1,
        )

        request = self.factory.post(
            "/api/attendance/mark/",
            {
                "lesson_id": self.lesson.id,
                "student_id": self.student.id,
                "status": "present",
                "reason": "Camera nosozligi sabab manual tasdiq",
            },
            format="json",
        )
        force_authenticate(request, user=self.teacher)
        response = self.mark_view(request)

        self.assertEqual(response.status_code, 200)
        attendance.refresh_from_db()
        self.assertEqual(attendance.status, "present")
        self.assertTrue(attendance.finalized)
        self.assertTrue(attendance.manual_override)
        self.assertEqual(attendance.override_reason, "Camera nosozligi sabab manual tasdiq")
        self.assertEqual(attendance.overridden_by_id, self.teacher.id)
        self.assertIsNotNone(attendance.overridden_at)

        log = AttendanceOverrideLog.objects.get(attendance=attendance)
        self.assertEqual(log.previous_status, "absent")
        self.assertEqual(log.new_status, "present")
        self.assertFalse(log.previous_finalized)
        self.assertTrue(log.new_finalized)
        self.assertEqual(log.reason, "Camera nosozligi sabab manual tasdiq")
        self.assertEqual(log.changed_by_id, self.teacher.id)

    def test_override_history_is_visible_for_lesson_teacher(self) -> None:
        attendance = Attendance.objects.create(
            lesson=self.lesson,
            student=self.student,
            status="present",
            finalized=True,
            finalized_at=timezone.now(),
            manual_override=True,
            override_reason="Manual correction",
            overridden_by=self.teacher,
            overridden_at=timezone.now(),
        )
        AttendanceOverrideLog.objects.create(
            attendance=attendance,
            lesson=self.lesson,
            student=self.student,
            previous_status="absent",
            new_status="present",
            previous_finalized=False,
            new_finalized=True,
            reason="Manual correction",
            changed_by=self.teacher,
        )

        request = self.factory.get(
            f"/api/attendance/lesson/{self.lesson.id}/student/{self.student.id}/overrides/"
        )
        force_authenticate(request, user=self.teacher)
        response = self.history_view(request, lesson_id=self.lesson.id, student_id=self.student.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["new_status"], "present")
        self.assertEqual(response.data[0]["reason"], "Manual correction")

    def test_mark_attendance_blocks_unrelated_teacher(self) -> None:
        request = self.factory.post(
            "/api/attendance/mark/",
            {
                "lesson_id": self.lesson.id,
                "student_id": self.student.id,
                "status": "absent",
                "reason": "Ruxsatsiz urinish",
            },
            format="json",
        )
        force_authenticate(request, user=self.other_teacher)
        response = self.mark_view(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(AttendanceOverrideLog.objects.count(), 0)


@override_settings(VIDEO_COMPLETION_RATIO=0.90)
class VideoLessonAccessTests(AcademicFixtureMixin, TestCase):
    """Asinxron (video) dars: video tugatilmaguncha keyingi bosqich bloklanadi."""

    def setUp(self) -> None:
        self.create_academic_context()
        # Darsni video turiga o'tkazamiz
        self.lesson.lesson_type = "video"
        self.lesson.save(update_fields=["lesson_type"])
        self.factory = APIRequestFactory()
        self.lesson_test = self.create_lesson_test()
        self.start_view = StartStudentTestView.as_view()

    def _progress(self, watch_seconds, duration_seconds=600):
        from attendance.models import LessonActivityLog

        log, _ = LessonActivityLog.objects.get_or_create(
            lesson=self.lesson, student=self.student
        )
        log.record_video_progress(
            watch_seconds=watch_seconds,
            duration_seconds=duration_seconds,
            completion_threshold=0.90,
        )
        return log

    def test_video_not_completed_blocks_access(self) -> None:
        from attendance.services import get_lesson_access_snapshot

        # 50% ko'rilgan — yetarli emas
        self._progress(watch_seconds=300, duration_seconds=600)
        snapshot = get_lesson_access_snapshot(self.student, self.lesson.id)
        self.assertFalse(snapshot["allowed"])
        self.assertEqual(snapshot["status"], "blocked_video_pending")
        self.assertEqual(snapshot["lesson_mode"], "video")

    def test_video_completed_opens_access(self) -> None:
        from attendance.services import get_lesson_access_snapshot

        # 95% ko'rilgan — threshold (90%) dan oshdi
        log = self._progress(watch_seconds=570, duration_seconds=600)
        self.assertTrue(log.video_completed)

        snapshot = get_lesson_access_snapshot(self.student, self.lesson.id)
        self.assertTrue(snapshot["allowed"])
        self.assertEqual(snapshot["status"], "open")

    def test_watch_seconds_cannot_exceed_duration_or_decrease(self) -> None:
        # Soxta: duration'dan ko'p watch yuborilsa cheklanadi
        log = self._progress(watch_seconds=99999, duration_seconds=600)
        self.assertEqual(log.video_watch_seconds, 600)
        self.assertTrue(log.video_completed)

        # Orqaga qaytarish qabul qilinmaydi
        log.record_video_progress(watch_seconds=10, duration_seconds=600, completion_threshold=0.90)
        self.assertEqual(log.video_watch_seconds, 600)

    def test_start_test_blocked_until_video_completed(self) -> None:
        self._progress(watch_seconds=120, duration_seconds=600)  # 20%

        request = self.factory.post(
            "/api/student-tests/start/",
            {"test_id": self.lesson_test.id},
            format="json",
        )
        force_authenticate(request, user=self.student)
        response = self.start_view(request)
        self.assertEqual(response.status_code, 400)

    def test_start_test_allowed_after_video_completed(self) -> None:
        self._progress(watch_seconds=600, duration_seconds=600)  # 100%

        request = self.factory.post(
            "/api/student-tests/start/",
            {"test_id": self.lesson_test.id},
            format="json",
        )
        force_authenticate(request, user=self.student)
        response = self.start_view(request)
        self.assertEqual(response.status_code, 201)
        self.assertIn("student_test_id", response.data)

    def test_combined_attendance_counts_includes_video(self) -> None:
        from attendance.services import combined_attendance_counts

        # Video tugatilmagan — attended 0
        self._progress(watch_seconds=120, duration_seconds=600)
        stats = combined_attendance_counts(student=self.student)
        self.assertEqual(stats["video_total"], 1)
        self.assertEqual(stats["video_completed"], 0)
        self.assertEqual(stats["attended"], 0)

        # Video tugatilgach — video davomati hisobga olinadi
        self._progress(watch_seconds=600, duration_seconds=600)
        stats = combined_attendance_counts(student=self.student)
        self.assertEqual(stats["video_completed"], 1)
        self.assertEqual(stats["attended"], 1)
        self.assertEqual(stats["attendance_rate"], 100.0)
