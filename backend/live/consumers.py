import json
from typing import Any, Dict

from django.conf import settings
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from profiles.models import StudentProfile
from attendance.services import build_live_attendance_preview

from .models import LiveFaceSession, LiveParticipant, LiveRoom


def _student_group_id(user):
    try:
        group_id = user.student_profile.group_id
        if group_id:
            return group_id
    except StudentProfile.DoesNotExist:
        pass
    return getattr(user, "group_id", None)


def _user_can_access_room(user, room) -> bool:
    role = getattr(user, "role", None)
    if user.is_superuser or role in ["admin", "teacher"]:
        if role == "teacher":
            try:
                teacher_id = getattr(room.lesson.teacher_subject, "teacher_id", None)
            except Exception:
                teacher_id = None
            return teacher_id == user.id
        return True

    if role == "student":
        group_id = _student_group_id(user)
        return bool(group_id and group_id == room.lesson.group_id)
    return False


def _participant_stale_cutoff():
    stale_seconds = int(getattr(settings, "LIVE_PARTICIPANT_STALE_SECONDS", 30) or 30)
    return timezone.now() - timezone.timedelta(seconds=max(5, stale_seconds))


def _active_room_participants(room):
    return (
        LiveParticipant.objects.filter(
            room=room,
            left_at__isnull=True,
            last_seen_at__gte=_participant_stale_cutoff(),
        )
        .select_related("user")
        .order_by("-joined_at")
    )


def _lesson_duration_seconds(room) -> int:
    lesson = getattr(room, "lesson", None)
    if not lesson or not lesson.start_time or not lesson.end_time:
        return 0
    if lesson.end_time <= lesson.start_time:
        return 0
    return int((lesson.end_time - lesson.start_time).total_seconds())


def _participant_join_metrics(participant, room) -> tuple[int, float]:
    if not participant:
        return 0, 0.0

    stale_seconds = int(getattr(settings, "LIVE_PARTICIPANT_STALE_SECONDS", 30) or 30)
    joined_seconds = participant.active_seconds(stale_after_seconds=stale_seconds)
    lesson_duration = _lesson_duration_seconds(room)
    joined_ratio = (joined_seconds / lesson_duration) if lesson_duration > 0 else 0.0
    return joined_seconds, round(joined_ratio, 4)


class LiveLessonConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        can_access = await self.user_can_access_room()
        if not can_access:
            await self.close(code=4003)
            return

        self.room_group_name = f"live_{self.room_name}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            await self.send(text_data=json.dumps({"type": "error", "message": "Invalid payload"}))
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": data,
            },
        )

    async def signal_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def user_can_access_room(self) -> bool:
        try:
            room = LiveRoom.objects.select_related("lesson", "lesson__teacher_subject__teacher").get(
                room_name=self.room_name
            )
        except LiveRoom.DoesNotExist:
            return False

        return _user_can_access_room(self.user, room)


class FaceVerificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        can_access = await self.user_can_access_room()
        if not can_access:
            await self.close(code=4003)
            return

        self.room_group_name = f"face_verification_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        session_data = await self.get_or_create_session()
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "session_started",
                    "session_id": session_data.get("id"),
                    "user_id": self.user.id,
                    "username": self.user.username,
                    "has_reference": session_data.get("has_reference", False),
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.end_session()

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            if message_type == "verify_frame":
                await self.handle_verify_frame(data)
                return
            if message_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
                return
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                    }
                )
            )
        except Exception as exc:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": f"Error processing message: {str(exc)}",
                    }
                )
            )

    async def handle_verify_frame(self, data: Dict[str, Any]):
        from .services import FaceVerificationService

        frame_data = data.get("frame_data")
        if not frame_data:
            await self.send(text_data=json.dumps({"type": "error", "message": "No frame data provided"}))
            return

        result = await database_sync_to_async(FaceVerificationService.verify_frame)(
            room_name=self.room_name,
            user=self.user,
            frame_data=frame_data,
        )

        await self.send(text_data=json.dumps({"type": "verification_result", **result}))

        monitoring_payload = await self.build_student_status_payload(result)
        if monitoring_payload:
            await self.channel_layer.group_send(
                f"live_monitoring_{self.room_name}",
                {
                    "type": "student_status_update_event",
                    "payload": monitoring_payload,
                },
            )

        if result.get("alert"):
            await self.channel_layer.group_send(
                f"live_monitoring_{self.room_name}",
                {
                    "type": "verification_alert_event",
                    "payload": {
                        "type": "verification_alert",
                        "user_id": self.user.id,
                        "username": self.user.username,
                        "alert_type": result.get("event_type"),
                        "message": result.get("message"),
                        "timestamp": timezone.now().isoformat(),
                    },
                },
            )

    @database_sync_to_async
    def user_can_access_room(self) -> bool:
        try:
            room = LiveRoom.objects.select_related("lesson", "lesson__teacher_subject__teacher").get(
                room_name=self.room_name
            )
        except LiveRoom.DoesNotExist:
            return False

        return _user_can_access_room(self.user, room)

    @database_sync_to_async
    def get_or_create_session(self) -> Dict[str, Any]:
        try:
            room = LiveRoom.objects.get(room_name=self.room_name)
            participant, _ = LiveParticipant.objects.get_or_create(
                room=room,
                user=self.user,
                defaults={"is_teacher": getattr(self.user, "role", None) == "teacher"},
            )

            session, created = LiveFaceSession.objects.get_or_create(
                participant=participant,
                room=room,
                user=self.user,
                defaults={
                    "reference_embedding": self.user.face_embedding,
                    "status": "active",
                },
            )
            participant.touch_presence()

            if not created and session.status == "ended":
                session.status = "active"
                session.ended_at = None
                session.save(update_fields=["status", "ended_at"])

            return {"id": session.id, "has_reference": bool(self.user.face_embedding)}
        except Exception:
            return {"id": None, "has_reference": False}

    @database_sync_to_async
    def end_session(self):
        session = (
            LiveFaceSession.objects.filter(
                room__room_name=self.room_name,
                user=self.user,
                status="active",
            )
            .order_by("-id")
            .first()
        )
        if session:
            session.status = "ended"
            session.ended_at = timezone.now()
            session.save(update_fields=["status", "ended_at"])

    @database_sync_to_async
    def build_student_status_payload(self, result: Dict[str, Any]) -> Dict[str, Any] | None:
        try:
            room = LiveRoom.objects.get(room_name=self.room_name)
            participant = (
                _active_room_participants(room).filter(user=self.user)
                .order_by("-id")
                .first()
            )
            joined_seconds, joined_ratio = _participant_join_metrics(participant, room)
            eligibility = build_live_attendance_preview(
                joined_ratio=joined_ratio,
                face_ratio=result.get("attendance_ratio"),
                face_checks=result.get("attendance_samples"),
                attendance_status=result.get("attendance_status"),
                finalized=False,
            )

            total_students = _active_room_participants(room).filter(
                is_teacher=False
            ).count()

            return {
                "type": "student_status_update",
                "room_id": room.id,
                "room_name": room.room_name,
                "total_students": total_students,
                "updates": [
                    {
                        "student_id": self.user.id,
                        "student_name": self.user.get_full_name() or self.user.username,
                        "face_detection_status": result.get("face_detection_status", "CHECKING"),
                        "confidence": result.get("confidence", 0),
                        "hand_raised": bool(participant.hand_raised) if participant else False,
                        "audio_enabled": room.stage_user_id == self.user.id,
                        "event_type": result.get("event_type"),
                        "status_reason": result.get("status_reason") or result.get("event_type"),
                        "success_rate": result.get("success_rate"),
                        "attendance_status": result.get("attendance_status"),
                        "attendance_ratio": result.get("attendance_ratio"),
                        "attendance_samples": result.get("attendance_samples"),
                        "joined_seconds": joined_seconds,
                        "joined_ratio": joined_ratio,
                        "eligibility_status": eligibility.get("status"),
                        "eligibility_reason": eligibility.get("reason"),
                        "last_verified_at": timezone.now().isoformat(),
                    }
                ],
                "timestamp": timezone.now().isoformat(),
            }
        except Exception:
            return None


class LiveMonitoringConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        can_access = await self.user_can_access_room()
        if not can_access:
            await self.close(code=4003)
            return

        self.monitoring_group_name = f"live_monitoring_{self.room_name}"
        await self.channel_layer.group_add(self.monitoring_group_name, self.channel_name)
        await self.accept()

        initial_data = await self.get_current_monitoring_data()
        room_state_payload = await self.get_current_room_state()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "monitoring_started",
                    "room_name": self.room_name,
                    "timestamp": timezone.now().isoformat(),
                    "data": initial_data,
                    "room_state": room_state_payload,
                }
            )
        )
        await self.send(text_data=json.dumps(room_state_payload))

    async def disconnect(self, close_code):
        if hasattr(self, "monitoring_group_name"):
            await self.channel_layer.group_discard(self.monitoring_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            await self.send(text_data=json.dumps({"type": "error", "message": "Invalid payload"}))
            return

        message_type = data.get("type")
        if message_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        if message_type == "request_update":
            payload = await self.get_current_monitoring_data()
            await self.send(text_data=json.dumps({"type": "student_status_update", **payload}))
            room_state_payload = await self.get_current_room_state()
            await self.send(text_data=json.dumps(room_state_payload))
            return

        await self.send(text_data=json.dumps({"type": "error", "message": f"Unknown type: {message_type}"}))

    async def student_status_update_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def verification_alert_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def room_state_update_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def user_can_access_room(self) -> bool:
        try:
            room = LiveRoom.objects.select_related("lesson", "lesson__teacher_subject__teacher").get(
                room_name=self.room_name
            )
        except LiveRoom.DoesNotExist:
            return False

        return _user_can_access_room(self.user, room)

    @database_sync_to_async
    def get_current_monitoring_data(self) -> Dict[str, Any]:
        return self._build_monitoring_data()

    @database_sync_to_async
    def get_current_room_state(self) -> Dict[str, Any]:
        return self._build_room_state_data()

    def _build_monitoring_data(self) -> Dict[str, Any]:
        try:
            room = LiveRoom.objects.get(room_name=self.room_name)
            sessions = (
                LiveFaceSession.objects.filter(room=room, status="active", user__role="student")
                .select_related("user", "participant")
                .prefetch_related("events")
            )

            updates = []
            for session in sessions:
                latest_event = session.events.order_by("-created_at").first()
                attendance_meta = (
                    latest_event.metadata.get("attendance", {})
                    if latest_event and isinstance(latest_event.metadata, dict)
                    else {}
                )
                joined_seconds, joined_ratio = _participant_join_metrics(session.participant, room)
                eligibility = build_live_attendance_preview(
                    joined_ratio=joined_ratio,
                    face_ratio=attendance_meta.get("ratio"),
                    face_checks=attendance_meta.get("samples"),
                    attendance_status=attendance_meta.get("status"),
                    finalized=False,
                )
                updates.append(
                    {
                        "student_id": session.user_id,
                        "student_name": session.user.get_full_name() or session.user.username,
                        "face_detection_status": self._get_face_status(latest_event),
                        "confidence": float(latest_event.confidence) if latest_event and latest_event.confidence else 0.0,
                        "hand_raised": bool(session.participant.hand_raised) if session.participant else False,
                        "audio_enabled": room.stage_user_id == session.user_id,
                        "event_type": latest_event.event_type if latest_event else None,
                        "status_reason": latest_event.event_type if latest_event else None,
                        "last_verified_at": latest_event.created_at.isoformat() if latest_event else None,
                        "success_rate": session.success_rate,
                        "attendance_status": attendance_meta.get("status"),
                        "attendance_ratio": attendance_meta.get("ratio"),
                        "attendance_samples": attendance_meta.get("samples"),
                        "joined_seconds": joined_seconds,
                        "joined_ratio": joined_ratio,
                        "eligibility_status": eligibility.get("status"),
                        "eligibility_reason": eligibility.get("reason"),
                    }
                )

            return {
                "room_id": room.id,
                "room_name": room.room_name,
                "total_students": len(updates),
                "verified_count": sum(1 for item in updates if item["face_detection_status"] == "DETECTED"),
                "updates": updates,
                "timestamp": timezone.now().isoformat(),
            }
        except Exception as exc:
            return {
                "room_name": self.room_name,
                "error": str(exc),
                "updates": [],
                "timestamp": timezone.now().isoformat(),
            }

    def _build_room_state_data(self) -> Dict[str, Any]:
        try:
            room = LiveRoom.objects.get(room_name=self.room_name)
            participants = (
                _active_room_participants(room)
            )
            student_ids = [
                participant.user_id
                for participant in participants
                if getattr(participant.user, "role", None) == "student"
            ]
            profiles = (
                StudentProfile.objects.select_related("group")
                .filter(user_id__in=student_ids)
            )
            profile_map = {profile.user_id: profile for profile in profiles}
            payload = []
            for participant in participants:
                user = participant.user
                role = getattr(user, "role", None) or ("admin" if user.is_superuser else "user")
                profile = profile_map.get(user.id)
                group_name = profile.group.name if profile and profile.group else ""
                payload.append(
                    {
                        "user_id": user.id,
                        "user_name": user.get_full_name() or user.username,
                        "role": role,
                        "is_teacher": participant.is_teacher,
                        "hand_raised": participant.hand_raised,
                        "group_name": group_name,
                        "group": group_name,
                        "group_code": group_name,
                        "group_title": group_name,
                    }
                )

            resolved_stage_user_id = room.stage_user_id
            if resolved_stage_user_id is None:
                active_teacher = participants.filter(is_teacher=True).first()
                resolved_stage_user_id = active_teacher.user_id if active_teacher else None

            return {
                "type": "room_state_update",
                "room_id": room.id,
                "room_name": room.room_name,
                "stage_user_id": room.stage_user_id,
                "resolved_stage_user_id": resolved_stage_user_id,
                "participants": payload,
                "timestamp": timezone.now().isoformat(),
            }
        except Exception as exc:
            return {
                "type": "room_state_update",
                "room_name": self.room_name,
                "participants": [],
                "error": str(exc),
                "timestamp": timezone.now().isoformat(),
            }

    @staticmethod
    def _get_face_status(event) -> str:
        if not event:
            return "CHECKING"
        if event.event_type == "success":
            return "DETECTED"
        if event.event_type == "multiple_faces":
            return "MULTIPLE"
        if event.event_type in {
            "no_face",
            "low_confidence",
            "no_reference",
            "ai_error",
            "invalid_frame",
            "no_embedding",
            "error",
        }:
            return "NOT_DETECTED"
        return "CHECKING"
