from __future__ import annotations

from datetime import timedelta

from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from attendance.models import Attendance
from core.test_support import AcademicFixtureMixin
from live.models import LiveFaceSession, LiveParticipant, LiveRoom
from live.views import LeaveLiveRoomView


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


@override_settings(
    FACE_ATTENDANCE_MIN_SAMPLES=3,
    FACE_ATTENDANCE_PRESENT_RATIO=0.60,
    LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.70,
    LIVE_PARTICIPANT_STALE_SECONDS=30,
)
class LiveParticipantFlowTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()
        self.factory = APIRequestFactory()
        self.leave_view = LeaveLiveRoomView.as_view()

    def test_touch_presence_after_stale_gap_restarts_presence_window(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="room-reconnect-101",
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

        reconnect_at = self.lesson_start + timedelta(minutes=40)
        participant.touch_presence(seen_at=reconnect_at, stale_after_seconds=30)
        participant.refresh_from_db()

        self.assertEqual(participant.accumulated_seconds, (10 * 60) + 30)
        self.assertEqual(participant.joined_at, reconnect_at)
        self.assertEqual(participant.last_seen_at, reconnect_at)
        self.assertIsNone(participant.left_at)

    def test_leave_stage_teacher_hands_stage_to_next_teacher(self) -> None:
        assistant_teacher = self.teacher.__class__.objects.create_user(
            username="assistant_teacher",
            password="secret",
            role="teacher",
            first_name="Second",
            last_name="Teacher",
        )
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="room-stage-handoff",
            is_active=True,
            started_at=self.lesson_start,
            stage_user=self.teacher,
        )
        teacher_participant = LiveParticipant.objects.create(
            room=room,
            user=self.teacher,
            is_teacher=True,
        )
        assistant_participant = LiveParticipant.objects.create(
            room=room,
            user=assistant_teacher,
            is_teacher=True,
        )

        request = self.factory.post(
            "/api/live/room/leave/",
            {"room_id": room.id},
            format="json",
        )
        force_authenticate(request, user=self.teacher)
        response = self.leave_view(request)

        self.assertEqual(response.status_code, 200)

        room.refresh_from_db()
        teacher_participant.refresh_from_db()
        assistant_participant.refresh_from_db()

        self.assertEqual(room.stage_user_id, assistant_teacher.id)
        self.assertIsNotNone(teacher_participant.left_at)
        self.assertIsNone(assistant_participant.left_at)
