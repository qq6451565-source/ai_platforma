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
        
        # Broadcast to admin/teacher if alert
        if result.get("alert"):
            await self.channel_layer.group_send(
                f"admin_monitoring_{self.room_name}",
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
