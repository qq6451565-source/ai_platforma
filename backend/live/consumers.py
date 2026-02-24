import json
from typing import Optional, Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class LiveLessonConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.room_group_name = f"live_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )


    async def receive(self, text_data):
        data = json.loads(text_data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": data
            }
        )


    async def signal_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))


class FaceVerificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time face verification during live sessions.
    
    Expected message format:
    {
        "type": "verify_frame",
        "frame_data": "base64_image_data",
        "timestamp": "ISO datetime"
    }
    
    Sends back:
    {
        "type": "verification_result",
        "verified": true/false,
        "confidence": 0.95,
        "faces_detected": 1,
        "event_type": "success",
        "message": "Verification successful"
    }
    """
    
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")
        
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.room_group_name = f"face_verification_{self.room_name}"
        self.user_channel_name = f"face_verification_{self.room_name}_{self.user.id}"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Initialize session
        session_data = await self.get_or_create_session()
        
        await self.accept()
        
        # Send initial session info
        await self.send(text_data=json.dumps({
            "type": "session_started",
            "session_id": session_data["id"],
            "user_id": self.user.id,
            "username": self.user.username,
            "has_reference": session_data["has_reference"],
        }))
    
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # End session
        await self.end_session()
    
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            if message_type == "verify_frame":
                await self.handle_verify_frame(data)
            elif message_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
            else:
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }))
        
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": f"Error processing message: {str(e)}"
            }))
    
    
    async def handle_verify_frame(self, data: Dict[str, Any]):
        """Process face verification for a single frame."""
        from .services import FaceVerificationService
        
        frame_data = data.get("frame_data")
        if not frame_data:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "No frame data provided"
            }))
            return
        
        # Process verification
        result = await database_sync_to_async(
            FaceVerificationService.verify_frame
        )(
            room_name=self.room_name,
            user=self.user,
            frame_data=frame_data,
        )
        
        # Send result to user
        await self.send(text_data=json.dumps({
            "type": "verification_result",
            **result
        }))
        
        # Broadcast to monitoring group (for teacher dashboard)
        await self.channel_layer.group_send(
            f"live_monitoring_{self.room_name}",
            {
                "type": "student_status_update",
                "room_name": self.room_name,
                "student_id": self.user.id,
                "student_name": self.user.get_full_name() or self.user.username,
                "face_detection_status": result.get("face_detection_status", "CHECKING"),
                "confidence": result.get("confidence", 0),
                "verified": result.get("verified", False),
                "timestamp": timezone.now().isoformat(),
            }
        )
        
        # Broadcast to admin/teacher if alert
        if result.get("alert"):
            await self.channel_layer.group_send(
                f"live_monitoring_{self.room_name}",
                {
                    "type": "verification_alert",
                    "user_id": self.user.id,
                    "username": self.user.username,
                    "alert_type": result.get("event_type"),
                    "message": result.get("message"),
                    "timestamp": timezone.now().isoformat(),
                }
            )
    
    
    async def verification_alert(self, event):
        """Receive verification alert from channel layer."""
        await self.send(text_data=json.dumps({
            "type": "alert",
            **event
        }))
    
    
    @database_sync_to_async
    def get_or_create_session(self) -> Dict[str, Any]:
        """Get or create face verification session for user in room."""
        from .models import LiveRoom, LiveParticipant, LiveFaceSession
        
        try:
            room = LiveRoom.objects.get(room_name=self.room_name)
            participant, _ = LiveParticipant.objects.get_or_create(
                room=room,
                user=self.user,
                defaults={'is_teacher': self.user.role == 'teacher'}
            )
            
            session, created = LiveFaceSession.objects.get_or_create(
                participant=participant,
                room=room,
                user=self.user,
                defaults={
                    'reference_embedding': self.user.face_embedding,
                    'status': 'active',
                }
            )
            
            if not created and session.status == 'ended':
                session.status = 'active'
                session.save()
            
            return {
                "id": session.id,
                "has_reference": bool(self.user.face_embedding),
            }
        
        except Exception as e:
            return {
                "id": None,
                "has_reference": False,
            }
    
    
    @database_sync_to_async
    def end_session(self):
        """End face verification session."""
        from .models import LiveFaceSession
        
        try:
            session = LiveFaceSession.objects.filter(
                room__room_name=self.room_name,
                user=self.user,
                status='active'
            ).first()
            
            if session:
                session.status = 'ended'
                session.ended_at = timezone.now()
                session.save()
        
        except Exception:
            pass


class LiveMonitoringConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time monitoring dashboard.
    Broadcasts student status updates to teacher/admin.
    
    Connects to: ws/live-monitoring/{room_name}/
    
    Broadcasts every 1-2 seconds:
    {
        "type": "student_status_update",
        "room_id": 123,
        "timestamp": "2026-02-24T10:30:45Z",
        "updates": [
            {
                "student_id": 456,
                "face_detection_status": "DETECTED",
                "confidence": 0.94,
                "hand_raised": false,
                "audio_enabled": true,
                "last_verified_at": "2026-02-24T10:30:40Z"
            },
            ...
        ]
    }
    """

    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Only teachers/admins can monitor
        user_role = getattr(self.user, "role", None)
        is_teacher = self.user.is_superuser or user_role in ["admin", "teacher"]

        if not is_teacher:
            await self.close(code=4003)  # Forbidden
            return

        self.monitoring_group_name = f"live_monitoring_{self.room_name}"

        # Join monitoring group
        await self.channel_layer.group_add(
            self.monitoring_group_name,
            self.channel_name
        )

        await self.accept()

        # Send initial data
        initial_data = await self.get_initial_monitoring_data()
        await self.send(text_data=json.dumps({
            "type": "monitoring_started",
            "room_name": self.room_name,
            "timestamp": timezone.now().isoformat(),
            "data": initial_data,
        }))

    async def disconnect(self, close_code):
        # Leave monitoring group
        await self.channel_layer.group_discard(
            self.monitoring_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming messages (usually ping/keep-alive)."""
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            if message_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
            elif message_type == "request_update":
                update_data = await self.get_current_monitoring_data()
                await self.send(text_data=json.dumps({
                    "type": "student_status_update",
                    **update_data,
                }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": f"Error: {str(e)}"
            }))

    async def student_status_update(self, event):
        """
        Receive student status update from channel layer.
        Broadcast to all monitoring clients.
        """
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_initial_monitoring_data(self) -> Dict[str, Any]:
        """Get initial monitoring data when client connects."""
        from .models import LiveRoom, LiveFaceSession

        try:
            room = LiveRoom.objects.get(room_name=self.room_name)

            # Get all students (non-teacher participants)
            sessions = LiveFaceSession.objects.filter(
                room=room,
                status='active',
                user__role='student'
            ).select_related('user', 'participant')

            students_data = []
            for session in sessions:
                latest_event = session.events.order_by('-created_at').first()

                student_data = {
                    "student_id": session.user_id,
                    "student_name": session.user.get_full_name() or session.user.username,
                    "face_detection_status": self._get_face_status(latest_event),
                    "confidence": float(latest_event.confidence) if latest_event and latest_event.confidence else 0.0,
                    "hand_raised": session.participant.hand_raised if session.participant else False,
                    "audio_enabled": room.stage_user_id == session.user_id,
                    "last_verified_at": latest_event.created_at.isoformat() if latest_event else None,
                    "success_rate": session.success_rate,
                }
                students_data.append(student_data)

            return {
                "room_id": room.id,
                "room_name": room.room_name,
                "total_students": len(students_data),
                "verified_count": sum(1 for s in students_data if s["face_detection_status"] == "DETECTED"),
                "updates": students_data,
                "timestamp": timezone.now().isoformat(),
            }

        except Exception as e:
            return {
                "room_name": self.room_name,
                "error": str(e),
                "updates": [],
            }

    @database_sync_to_async
    def get_current_monitoring_data(self) -> Dict[str, Any]:
        """Get current student statuses for broadcast."""
        return self.get_initial_monitoring_data()

    @staticmethod
    def _get_face_status(event) -> str:
        """Map event type to face detection status."""
        if not event:
            return "CHECKING"

        event_type = event.event_type
        if event_type == "success":
            return "DETECTED"
        elif event_type == "no_face":
            return "NOT_DETECTED"
        elif event_type == "multiple_faces":
            return "MULTIPLE"
        else:
            return "CHECKING"
