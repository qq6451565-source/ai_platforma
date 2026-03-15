from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from groups.models import Group
from live.models import LiveParticipant, LiveRoom
from live.views import (
    JoinLiveLessonView,
    JoinLiveRoomView,
    LiveRoomHeartbeatView,
    LiveRoomStateView,
    RaiseHandView,
    SetStageUserView,
)

from core.test_support import AcademicFixtureMixin


@override_settings(LIVE_PARTICIPANT_STALE_SECONDS=30)
class LiveEndpointTests(AcademicFixtureMixin, TestCase):
    def setUp(self) -> None:
        self.create_academic_context()
        self.factory = APIRequestFactory()
        self.join_lesson_view = JoinLiveLessonView.as_view()
        self.join_room_view = JoinLiveRoomView.as_view()
        self.heartbeat_view = LiveRoomHeartbeatView.as_view()
        self.state_view = LiveRoomStateView.as_view()
        self.raise_hand_view = RaiseHandView.as_view()
        self.set_stage_view = SetStageUserView.as_view()

    def _create_other_group_student(self) -> User:
        other_group = Group.objects.create(
            direction=self.direction,
            language="uz",
            level=3,
        )
        return User.objects.create_user(
            username="outsider_student",
            password="secret",
            role="student",
            first_name="Out",
            last_name="Sider",
            group=other_group,
        )

    def test_teacher_join_lesson_creates_room_participant_and_stage_owner(self) -> None:
        request = self.factory.get(f"/api/live/join/{self.lesson.id}/")
        force_authenticate(request, user=self.teacher)
        response = self.join_lesson_view(request, lesson_id=self.lesson.id)

        self.assertEqual(response.status_code, 200)
        self.assertIn("room_id", response.data)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["livekit_url"], "ws://127.0.0.1:7880")

        room = LiveRoom.objects.get(lesson=self.lesson)
        participant = LiveParticipant.objects.get(room=room, user=self.teacher)

        self.assertTrue(room.is_active)
        self.assertEqual(room.stage_user_id, self.teacher.id)
        self.assertTrue(participant.is_teacher)
        self.assertIsNone(participant.left_at)

    def test_student_join_room_requires_matching_group(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="lesson-room-join",
            is_active=True,
            started_at=timezone.now(),
        )
        outsider = self._create_other_group_student()

        denied_request = self.factory.get(f"/api/live/join/{self.lesson.id}/")
        force_authenticate(denied_request, user=outsider)
        denied_response = self.join_lesson_view(denied_request, lesson_id=self.lesson.id)

        self.assertEqual(denied_response.status_code, 403)

        allowed_request = self.factory.post(
            "/api/live/room/join/",
            {"room_id": room.id},
            format="json",
        )
        force_authenticate(allowed_request, user=self.student)
        allowed_response = self.join_room_view(allowed_request)

        self.assertEqual(allowed_response.status_code, 200)
        self.assertEqual(allowed_response.data["message"], "Joined")
        self.assertTrue(
            LiveParticipant.objects.filter(room=room, user=self.student, left_at__isnull=True).exists()
        )

    def test_heartbeat_creates_participant_and_restarts_after_stale_gap(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="lesson-room-heartbeat",
            is_active=True,
            started_at=self.lesson_start,
        )

        create_request = self.factory.post(
            "/api/live/room/heartbeat/",
            {"room_id": room.id},
            format="json",
        )
        force_authenticate(create_request, user=self.student)
        create_response = self.heartbeat_view(create_request)

        self.assertEqual(create_response.status_code, 200)
        participant = LiveParticipant.objects.get(room=room, user=self.student)
        self.assertIsNone(participant.left_at)

        participant.joined_at = self.lesson_start
        participant.last_seen_at = self.lesson_start + timedelta(minutes=8)
        participant.save(update_fields=["joined_at", "last_seen_at"])

        stale_heartbeat_at = self.lesson_start + timedelta(minutes=25)
        follow_up_request = self.factory.post(
            "/api/live/room/heartbeat/",
            {"room_id": room.id},
            format="json",
        )
        force_authenticate(follow_up_request, user=self.student)
        with patch("live.models.timezone.now", return_value=stale_heartbeat_at):
            follow_up_response = self.heartbeat_view(follow_up_request)

        self.assertEqual(follow_up_response.status_code, 200)
        participant.refresh_from_db()

        self.assertEqual(participant.accumulated_seconds, (8 * 60) + 30)
        self.assertEqual(participant.joined_at, stale_heartbeat_at)
        self.assertEqual(participant.last_seen_at, stale_heartbeat_at)

    def test_raise_hand_and_stage_selection_updates_room_state(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="lesson-room-stage",
            is_active=True,
            started_at=timezone.now(),
            stage_user=self.teacher,
        )
        LiveParticipant.objects.create(room=room, user=self.teacher, is_teacher=True)
        student_participant = LiveParticipant.objects.create(room=room, user=self.student, is_teacher=False)

        hand_request = self.factory.post(
            "/api/live/hand/",
            {"room_id": room.id, "raised": True},
            format="json",
        )
        force_authenticate(hand_request, user=self.student)
        hand_response = self.raise_hand_view(hand_request)

        self.assertEqual(hand_response.status_code, 200)
        self.assertTrue(hand_response.data["hand_raised"])

        stage_request = self.factory.post(
            "/api/live/stage/",
            {"room_id": room.id, "user_id": self.student.id},
            format="json",
        )
        force_authenticate(stage_request, user=self.teacher)
        stage_response = self.set_stage_view(stage_request)

        self.assertEqual(stage_response.status_code, 200)
        self.assertEqual(stage_response.data["stage_user_id"], self.student.id)

        room.refresh_from_db()
        student_participant.refresh_from_db()
        self.assertEqual(room.stage_user_id, self.student.id)
        self.assertFalse(student_participant.hand_raised)

    def test_state_view_excludes_stale_participants_and_resolves_teacher_stage(self) -> None:
        room = LiveRoom.objects.create(
            lesson=self.lesson,
            room_name="lesson-room-state",
            is_active=True,
            started_at=timezone.now(),
            stage_user=None,
        )
        teacher_participant = LiveParticipant.objects.create(room=room, user=self.teacher, is_teacher=True)
        active_student = LiveParticipant.objects.create(room=room, user=self.student, is_teacher=False)
        stale_student = User.objects.create_user(
            username="stale_student",
            password="secret",
            role="student",
            first_name="Stale",
            last_name="Student",
            group=self.group,
        )
        stale_participant = LiveParticipant.objects.create(room=room, user=stale_student, is_teacher=False)

        teacher_participant.last_seen_at = timezone.now()
        teacher_participant.save(update_fields=["last_seen_at"])
        active_student.last_seen_at = timezone.now()
        active_student.save(update_fields=["last_seen_at"])
        stale_participant.last_seen_at = timezone.now() - timedelta(minutes=2)
        stale_participant.save(update_fields=["last_seen_at"])

        request = self.factory.get("/api/live/state/", {"room_id": room.id})
        force_authenticate(request, user=self.teacher)
        response = self.state_view(request)

        self.assertEqual(response.status_code, 200)
        participant_ids = {entry["user_id"] for entry in response.data["participants"]}

        self.assertEqual(response.data["resolved_stage_user_id"], self.teacher.id)
        self.assertIn(self.teacher.id, participant_ids)
        self.assertIn(self.student.id, participant_ids)
        self.assertNotIn(stale_student.id, participant_ids)
