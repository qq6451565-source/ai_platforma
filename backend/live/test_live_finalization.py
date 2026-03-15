from __future__ import annotations

from datetime import timedelta

from django.test import TestCase, override_settings

from attendance.models import Attendance
from core.test_support import AcademicFixtureMixin
from live.models import LiveFaceSession, LiveParticipant, LiveRoom


@override_settings(
    FACE_ATTENDANCE_MIN_SAMPLES=3,
    FACE_ATTENDANCE_PRESENT_RATIO=0.60,
    LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.70,
    LIVE_PARTICIPANT_STALE_SECONDS=30,
)
class LiveAttendanceFinalizationSignalTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()

    def test_room_close_finalizes_attendance_using_face_and_presence_metrics(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="room-graph-101",
            is_active=True,
            started_at=self.lesson_start,
        )
        participant = LiveParticipant.objects.create(
            room=room,
            user=self.student,
            is_teacher=False,
        )
        participant.joined_at = self.lesson_start + timedelta(minutes=5)
        participant.last_seen_at = self.lesson_end
        participant.save(update_fields=["joined_at", "last_seen_at"])

        LiveFaceSession.objects.create(
            participant=participant,
            room=room,
            user=self.student,
            verification_count=5,
            success_count=4,
        )

        room.is_active = False
        room.ended_at = self.lesson_end
        room.save(update_fields=["is_active", "ended_at"])

        attendance = Attendance.objects.get(lesson=self.lesson, student=self.student)

        self.assertTrue(attendance.finalized)
        self.assertEqual(attendance.status, "present")
        self.assertEqual(attendance.face_check_count, 5)
        self.assertEqual(attendance.face_success_count, 4)
        self.assertEqual(attendance.face_verified_ratio, 0.8)
        self.assertEqual(attendance.joined_seconds, 95 * 60)
        self.assertEqual(attendance.joined_ratio, 0.95)

    def test_room_close_respects_stale_presence_cutoff(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="room-graph-stale",
            is_active=True,
            started_at=self.lesson_start,
        )
        participant = LiveParticipant.objects.create(
            room=room,
            user=self.student,
            is_teacher=False,
        )
        participant.joined_at = self.lesson_start
        participant.last_seen_at = self.lesson_start + timedelta(minutes=10)
        participant.save(update_fields=["joined_at", "last_seen_at"])

        LiveFaceSession.objects.create(
            participant=participant,
            room=room,
            user=self.student,
            verification_count=5,
            success_count=5,
        )

        room.is_active = False
        room.ended_at = self.lesson_end
        room.save(update_fields=["is_active", "ended_at"])

        attendance = Attendance.objects.get(lesson=self.lesson, student=self.student)

        self.assertTrue(attendance.finalized)
        self.assertEqual(attendance.status, "absent")
        self.assertEqual(attendance.face_verified_ratio, 1.0)
        self.assertEqual(attendance.joined_seconds, (10 * 60) + 30)
        self.assertEqual(attendance.joined_ratio, 0.105)
