"""
Face verification service for live sessions.
Integrates with ai.clients module (centralized AI gateway client).
"""
import base64
import logging
from datetime import timedelta
from typing import Any, Dict, Optional

import numpy as np
from django.conf import settings
from django.utils import timezone

from ai.clients import AIConnectionError, face_analyze
from .models import (
    FaceVerificationSettings,
    LiveFaceEvent,
    LiveFaceSession,
    LiveParticipant,
    LiveRoom,
)
from accounts.models import User
from attendance.models import Attendance

logger = logging.getLogger(__name__)

# Event types that mean "face genuinely detected in frame"
_FACE_DETECTED_EVENTS = {"success", "low_confidence", "multiple_faces", "no_reference", "no_embedding"}
# Event types that yield no face at all
_FACE_ABSENT_EVENTS = {"no_face", "invalid_frame", "ai_error", "error"}


def _face_detection_status_for(event_type: str) -> str:
    if event_type == "success":
        return "DETECTED"
    if event_type == "multiple_faces":
        return "MULTIPLE"
    if event_type in _FACE_ABSENT_EVENTS:
        return "NOT_DETECTED"
    if event_type == "disabled":
        return "DETECTED"
    return "CHECKING"


def _cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Cosine similarity mapped to [0, 1]."""
    try:
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(max(0.0, min(1.0, (np.dot(a, b) / (norm_a * norm_b) + 1) / 2)))
    except Exception:
        return 0.0


class FaceVerificationService:
    """
    Central service for face verification in live sessions.

    Supports two modes:
      • Student mode  — embedding comparison against stored reference.
      • Teacher/presence mode — checks whether a face is visible (no reference needed).
    """

    # ──────────────────────────────────────────────────────────────────────────
    # Public entry-point
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def verify_frame(
        cls,
        room_name: str,
        user: User,
        frame_data: str,
    ) -> Dict[str, Any]:
        """
        Analyse a single webcam frame for the given user inside *room_name*.

        Returns a dict that is sent directly to the WebSocket client and to
        the monitoring channel.
        """
        try:
            cfg = FaceVerificationSettings.get_settings()

            if not cfg.verification_enabled:
                return cls._disabled_response()

            room = LiveRoom.objects.get(room_name=room_name)
            participant, _ = LiveParticipant.objects.get_or_create(
                room=room,
                user=user,
                defaults={"is_teacher": getattr(user, "role", None) in ("teacher", "admin")},
            )
            participant.touch_presence()
            session, _ = LiveFaceSession.objects.get_or_create(
                participant=participant,
                room=room,
                user=user,
                defaults={
                    "reference_embedding": user.face_embedding,
                    "status": "active",
                },
            )
            # Re-activate a previously ended session
            if session.status == "ended":
                session.status = "active"
                session.ended_at = None
                session.save(update_fields=["status", "ended_at"])

            frame_bytes = cls._decode_frame(frame_data)
            if not frame_bytes:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="invalid_frame",
                    verified=False,
                    message="Invalid frame data",
                    alert=False,
                )

            # ── AI analysis (via centralized client) ─────────────────────────
            try:
                analysis = face_analyze(frame_bytes)
            except AIConnectionError as exc:
                logger.warning("AI gateway unreachable during live verify user=%s: %s", user.id, exc)
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="ai_error",
                    verified=False,
                    message="AI service unavailable",
                    alert=False,
                )

            if not analysis:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="ai_error",
                    verified=False,
                    message="AI analysis returned no result",
                    alert=False,
                )

            faces_detected: int = int(analysis.get("faces_detected") or 0)
            faces: list = analysis.get("faces") or []

            # ── No face ──────────────────────────────────────────────────────
            if faces_detected == 0:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="no_face",
                    faces_detected=0,
                    verified=False,
                    message="No face detected",
                    alert=cfg.alert_on_no_face,
                )

            # ── Multiple faces ────────────────────────────────────────────────
            if faces_detected > cfg.max_faces_allowed:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="multiple_faces",
                    faces_detected=faces_detected,
                    verified=False,
                    message=f"Multiple faces detected ({faces_detected})",
                    alert=cfg.alert_on_multiple_faces,
                )

            frame_embedding: list = (faces[0].get("embedding") or []) if faces else []

            # ── Teacher / presence-only mode ──────────────────────────────────
            # Teachers have no attendance to track — we just confirm presence.
            role = getattr(user, "role", None)
            if role in ("teacher", "admin") or user.is_superuser:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="success",
                    faces_detected=faces_detected,
                    confidence=1.0,
                    frame_embedding=frame_embedding,
                    verified=True,
                    message="Face detected (teacher presence)",
                    alert=False,
                )

            # ── Student mode — embedding comparison ──────────────────────────
            reference = user.face_embedding or (session.reference_embedding or None)
            if not reference:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="no_reference",
                    faces_detected=faces_detected,
                    verified=False,
                    message="No reference embedding — re-register face",
                    alert=True,
                )

            if not frame_embedding:
                return cls._create_event(
                    session, room, user, cfg,
                    event_type="no_embedding",
                    faces_detected=faces_detected,
                    verified=False,
                    message="Could not extract face embedding from frame",
                    alert=False,
                )

            confidence = _cosine_similarity(reference, frame_embedding)
            verified = confidence >= cfg.confidence_threshold

            return cls._create_event(
                session, room, user, cfg,
                event_type="success" if verified else "low_confidence",
                faces_detected=faces_detected,
                confidence=confidence,
                frame_embedding=frame_embedding,
                verified=verified,
                message=(
                    f"Verified ({confidence:.1%})" if verified
                    else f"Low confidence ({confidence:.1%})"
                ),
                alert=False if verified else cfg.alert_on_verification_fail,
            )

        except LiveRoom.DoesNotExist:
            return cls._error_response("Room not found")
        except Exception as exc:
            logger.exception("Unexpected error in verify_frame user=%s room=%s: %s", user.id, room_name, exc)
            return cls._error_response(str(exc))

    # ──────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _decode_frame(frame_data: str) -> Optional[bytes]:
        try:
            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]
            return base64.b64decode(frame_data)
        except Exception:
            return None

    @classmethod
    def _create_event(
        cls,
        session: LiveFaceSession,
        room: LiveRoom,
        user: User,
        cfg: FaceVerificationSettings,
        *,
        event_type: str,
        verified: bool = False,
        faces_detected: int = 0,
        confidence: Optional[float] = None,
        frame_embedding: Optional[list] = None,
        message: str = "",
        alert: bool = False,
    ) -> Dict[str, Any]:
        """Persist a LiveFaceEvent, update session counters and attendance."""

        event = LiveFaceEvent.objects.create(
            session=session,
            room=room,
            user=user,
            event_type=event_type,
            faces_detected=faces_detected,
            confidence=confidence,
            frame_embedding=frame_embedding,
            is_verified=verified,
            alert_sent=alert,
        )

        # ── Session counters ──────────────────────────────────────────────────
        session.last_verification_at = timezone.now()
        session.verification_count += 1
        if verified:
            session.success_count += 1
        else:
            session.fail_count += 1
        session.save(update_fields=[
            "last_verification_at", "verification_count", "success_count", "fail_count",
        ])

        # ── Attendance (students only) ────────────────────────────────────────
        attendance_state = cls._update_live_attendance(session, room, user, cfg)
        if attendance_state:
            event.metadata = {**(event.metadata or {}), "attendance": attendance_state}
            event.save(update_fields=["metadata"])

        face_detection_status = _face_detection_status_for(event_type)

        return {
            "verified": verified,
            "confidence": confidence,
            "faces_detected": faces_detected,
            "event_type": event_type,
            "status_reason": event_type,
            "face_detection_status": face_detection_status,
            "event_id": event.id,
            "message": message,
            "alert": alert,
            "success_rate": round(session.success_rate, 2),
            "attendance_status": attendance_state.get("status") if attendance_state else None,
            "attendance_ratio": attendance_state.get("ratio") if attendance_state else None,
            "attendance_samples": attendance_state.get("samples") if attendance_state else None,
        }

    @classmethod
    def _update_live_attendance(
        cls,
        session: LiveFaceSession,
        room: LiveRoom,
        user: User,
        cfg: FaceVerificationSettings,
    ) -> Optional[Dict[str, Any]]:
        """Rolling-window attendance decision for students."""
        if getattr(user, "role", None) != "student":
            return None
        if not cfg.auto_attendance:
            return None

        window_sec = max(15, int(getattr(settings, "FACE_ATTENDANCE_WINDOW_SECONDS", 60) or 60))
        min_samples = max(1, int(getattr(settings, "FACE_ATTENDANCE_MIN_SAMPLES", 6) or 6))
        ratio_thr = float(max(0.1, min(1.0,
            float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0.70) or 0.70)
        )))

        window_start = timezone.now() - timedelta(seconds=window_sec)
        window_qs = LiveFaceEvent.objects.filter(
            session=session, created_at__gte=window_start
        ).exclude(event_type__in=["disabled", "invalid_frame", "ai_error", "error"])

        rolling_total = window_qs.count()
        rolling_ok = window_qs.filter(is_verified=True).count()
        rolling_ratio = (rolling_ok / rolling_total) if rolling_total else 0.0

        total = int(session.verification_count or 0)
        total_ok = int(session.success_count or 0)
        cumulative_ratio = (total_ok / total) if total else 0.0

        decision_ready = rolling_total >= min_samples or total >= min_samples
        is_present = decision_ready and (
            rolling_ratio >= ratio_thr or cumulative_ratio >= ratio_thr
        )

        attendance, _ = Attendance.objects.get_or_create(
            lesson=room.lesson,
            student=user,
            defaults={"status": "absent"},
        )
        new_status = "present" if is_present else "absent"
        if attendance.status != new_status:
            attendance.status = new_status
            attendance.save(update_fields=["status", "timestamp"])

        return {
            "status": new_status,
            "ratio": round(cumulative_ratio, 4),
            "rolling_ratio": round(rolling_ratio, 4),
            "samples": total,
            "rolling_samples": rolling_total,
            "threshold": ratio_thr,
            "window_seconds": window_sec,
            "min_samples": min_samples,
            "updated_at": timezone.now().isoformat(),
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Static response factories
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _disabled_response() -> Dict[str, Any]:
        return {
            "verified": True,
            "confidence": 1.0,
            "faces_detected": 1,
            "event_type": "disabled",
            "status_reason": "disabled",
            "face_detection_status": "DETECTED",
            "message": "Face verification is disabled",
            "alert": False,
        }

    @staticmethod
    def _error_response(message: str) -> Dict[str, Any]:
        return {
            "verified": False,
            "confidence": None,
            "faces_detected": 0,
            "event_type": "error",
            "status_reason": "error",
            "face_detection_status": "NOT_DETECTED",
            "message": message,
            "alert": False,
        }
