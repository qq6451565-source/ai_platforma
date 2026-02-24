"""
Face verification service for live sessions.
Integrates with AI Gateway for face analysis and verification.
"""
import base64
import os
import requests
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
                "message": "Live room not found",
                "alert": False,
            }
        except Exception as e:
            return {
                "verified": False,
                "event_type": "error",
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
        
        # Determine face detection status
        if event_type == "success":
            face_detection_status = "DETECTED"
        elif event_type == "no_face":
            face_detection_status = "NOT_DETECTED"
        elif event_type == "multiple_faces":
            face_detection_status = "MULTIPLE"
        else:
            face_detection_status = "CHECKING"
        
        return {
            "verified": verified,
            "confidence": confidence,
            "faces_detected": faces_detected,
            "event_type": event_type,
            "face_detection_status": face_detection_status,
            "event_id": event.id,
            "message": message,
            "alert": alert,
        }
