"""
Face verification service for live sessions.
Integrates with AI Gateway for face analysis and verification.
"""
import base64
import os
import requests
from datetime import timedelta
from typing import Dict, Any, Optional
from django.utils import timezone
from django.conf import settings

from .models import (
    LiveRoom,
    LiveParticipant,
    LiveFaceSession,
    LiveFaceEvent,
    FaceVerificationSettings,
)
from accounts.models import User
from attendance.models import Attendance


class FaceVerificationService:
    """Service for handling face verification during live sessions."""
    
    AI_BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:8001")
    AI_API_KEY = os.getenv("AI_API_KEY", "default-key")
    
    @classmethod
    def verify_frame(
        cls,
        room_name: str,
        user: User,
        frame_data: str,
    ) -> Dict[str, Any]:
        """
        Verify a single frame from user's webcam.
        
        Args:
            room_name: Live room identifier
            user: User being verified
            frame_data: Base64-encoded image data (with or without prefix)
        
        Returns:
            {
                "verified": bool,
                "confidence": float,
                "faces_detected": int,
                "event_type": str,
                "message": str,
                "alert": bool,
            }
        """
        try:
            # Get settings
            settings_obj = FaceVerificationSettings.get_settings()
            
            if not settings_obj.verification_enabled:
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
            
            # Get room and session
            room = LiveRoom.objects.get(room_name=room_name)
            participant = LiveParticipant.objects.get(room=room, user=user)
            session = LiveFaceSession.objects.get(
                participant=participant,
                room=room,
                user=user,
            )
            
            # Check if user has reference embedding
            if not user.face_embedding:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='no_reference',
                    verified=False,
                    message="No reference face embedding found",
                    alert=True,
                )
            
            # Decode frame data
            frame_bytes = cls._decode_frame_data(frame_data)
            if not frame_bytes:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='invalid_frame',
                    verified=False,
                    message="Invalid frame data",
                    alert=False,
                )
            
            # Call AI Gateway to analyze faces
            analysis_result = cls._analyze_face_ai(frame_bytes)
            
            if not analysis_result:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='ai_error',
                    verified=False,
                    message="AI analysis failed",
                    alert=False,
                )
            
            faces_detected = analysis_result.get("faces_detected", 0)
            
            # Check face count
            if faces_detected == 0:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='no_face',
                    faces_detected=0,
                    verified=False,
                    message="No face detected in frame",
                    alert=settings_obj.alert_on_no_face,
                )
            
            if faces_detected > settings_obj.max_faces_allowed:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='multiple_faces',
                    faces_detected=faces_detected,
                    verified=False,
                    message=f"Multiple faces detected ({faces_detected})",
                    alert=settings_obj.alert_on_multiple_faces,
                )
            
            # Get primary face embedding
            faces = analysis_result.get("faces", [])
            if not faces:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='no_face',
                    verified=False,
                    message="No face data in analysis",
                    alert=False,
                )
            
            primary_face = faces[0]
            frame_embedding = primary_face.get("embedding", [])
            
            if not frame_embedding:
                return cls._create_event(
                    session=session,
                    room=room,
                    user=user,
                    event_type='no_embedding',
                    verified=False,
                    message="Failed to extract face embedding",
                    alert=False,
                )
            
            # Compare embeddings
            confidence = cls._compare_embeddings(
                user.face_embedding,
                frame_embedding
            )
            
            verified = confidence >= settings_obj.confidence_threshold
            
            if verified:
                event_type = 'success'
                message = f"Verification successful (confidence: {confidence:.2%})"
                alert = False
            else:
                event_type = 'low_confidence'
                message = f"Verification failed (confidence: {confidence:.2%})"
                alert = settings_obj.alert_on_verification_fail
            
            return cls._create_event(
                session=session,
                room=room,
                user=user,
                event_type=event_type,
                faces_detected=faces_detected,
                confidence=confidence,
                frame_embedding=frame_embedding,
                verified=verified,
                message=message,
                alert=alert,
            )
        
        except LiveRoom.DoesNotExist:
            return {
                "verified": False,
                "event_type": "error",
                "status_reason": "error",
                "face_detection_status": "NOT_DETECTED",
                "message": "Live room not found",
                "alert": False,
            }
        except Exception as e:
            return {
                "verified": False,
                "event_type": "error",
                "status_reason": "error",
                "face_detection_status": "NOT_DETECTED",
                "message": f"Verification error: {str(e)}",
                "alert": False,
            }
    
    
    @classmethod
    def _decode_frame_data(cls, frame_data: str) -> Optional[bytes]:
        """Decode base64 frame data to bytes."""
        try:
            # Remove data URL prefix if present
            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]
            
            return base64.b64decode(frame_data)
        except Exception:
            return None
    
    
    @classmethod
    def _analyze_face_ai(cls, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """Call AI Gateway to analyze face in image."""
        try:
            files = {"file": ("frame.jpg", image_bytes, "image/jpeg")}
            headers = {"X-API-Key": cls.AI_API_KEY}
            
            response = requests.post(
                f"{cls.AI_BASE_URL}/face/analyze",
                files=files,
                headers=headers,
                timeout=10,
            )
            
            if response.status_code == 200:
                return response.json()
            
            return None
        
        except Exception as e:
            print(f"AI Gateway error: {e}")
            return None
    
    
    @classmethod
    def _compare_embeddings(
        cls,
        embedding1: list,
        embedding2: list
    ) -> float:
        """
        Compare two face embeddings using cosine similarity.
        
        Returns confidence score (0.0 to 1.0)
        """
        try:
            import numpy as np
            
            if not embedding1 or not embedding2:
                return 0.0
            
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            cosine_sim = dot_product / (norm1 * norm2)
            # Convert to 0-1 range (cosine similarity is -1 to 1)
            confidence = (cosine_sim + 1) / 2
            
            return float(max(0.0, min(1.0, confidence)))
        
        except Exception:
            return 0.0
    
    
    @classmethod
    def _create_event(
        cls,
        session: LiveFaceSession,
        room: LiveRoom,
        user: User,
        event_type: str,
        verified: bool = False,
        faces_detected: int = 0,
        confidence: Optional[float] = None,
        frame_embedding: Optional[list] = None,
        message: str = "",
        alert: bool = False,
    ) -> Dict[str, Any]:
        """Create a face verification event and update session."""
        
        # Create event
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
        
        # Update session
        session.last_verification_at = timezone.now()
        session.verification_count += 1
        
        if verified:
            session.success_count += 1
        else:
            session.fail_count += 1
        
        session.save()

        attendance_state = cls._update_live_attendance(
            session=session,
            room=room,
            user=user,
        )
        if attendance_state:
            event.metadata = {
                **(event.metadata or {}),
                "attendance": attendance_state,
            }
            event.save(update_fields=["metadata"])
        
        # Determine face detection status
        if event_type == "success":
            face_detection_status = "DETECTED"
        elif event_type == "multiple_faces":
            face_detection_status = "MULTIPLE"
        elif event_type in {
            "no_face",
            "no_reference",
            "low_confidence",
            "no_embedding",
            "invalid_frame",
            "ai_error",
            "error",
        }:
            face_detection_status = "NOT_DETECTED"
        else:
            face_detection_status = "CHECKING"
        
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
    ) -> Optional[Dict[str, Any]]:
        """
        Update lesson attendance from rolling face verification results.

        Decision model:
        - Check rolling window (default 60s) and cumulative session success.
        - Mark `present` only after minimum samples.
        """
        role = getattr(user, "role", None)
        if role != "student":
            return None

        settings_obj = FaceVerificationSettings.get_settings()
        if not settings_obj.auto_attendance:
            return None

        window_seconds = max(15, int(getattr(settings, "FACE_ATTENDANCE_WINDOW_SECONDS", 60) or 60))
        min_samples = max(1, int(getattr(settings, "FACE_ATTENDANCE_MIN_SAMPLES", 6) or 6))
        ratio_threshold = float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0.70) or 0.70)
        ratio_threshold = max(0.1, min(1.0, ratio_threshold))

        window_start = timezone.now() - timedelta(seconds=window_seconds)
        window_events = (
            LiveFaceEvent.objects.filter(session=session, created_at__gte=window_start)
            .exclude(event_type__in=["disabled", "invalid_frame", "ai_error", "error"])
        )
        rolling_samples = window_events.count()
        rolling_success = window_events.filter(is_verified=True).count()
        rolling_ratio = (rolling_success / rolling_samples) if rolling_samples else 0.0

        total_samples = int(session.verification_count or 0)
        total_success = int(session.success_count or 0)
        cumulative_ratio = (total_success / total_samples) if total_samples else 0.0

        decision_ready = rolling_samples >= min_samples or total_samples >= min_samples
        is_present = bool(
            decision_ready and (
                rolling_ratio >= ratio_threshold or cumulative_ratio >= ratio_threshold
            )
        )

        attendance, _ = Attendance.objects.get_or_create(
            lesson=room.lesson,
            student=user,
            defaults={"status": "absent"},
        )
        next_status = "present" if is_present else "absent"
        if attendance.status != next_status:
            attendance.status = next_status
            attendance.save(update_fields=["status", "timestamp"])

        return {
            "status": next_status,
            "ratio": round(cumulative_ratio, 4),
            "rolling_ratio": round(rolling_ratio, 4),
            "samples": total_samples,
            "rolling_samples": rolling_samples,
            "threshold": ratio_threshold,
            "window_seconds": window_seconds,
            "min_samples": min_samples,
            "updated_at": timezone.now().isoformat(),
        }
