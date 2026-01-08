# group_chat/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import GroupMessage
from accounts.models import User
from groups.models import Group


class GroupChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        ws://127.0.0.1:8000/ws/chat/group/<group_id>/
        """
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"group_chat_{self.group_id}"

        # Kanal guruhiga qo‘shamiz
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Kanal guruhidan chiqamiz
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data=None, bytes_data=None):
        """
        Clientdan keladigan ma'lumot:
        {
            "sender_id": 2,
            "text": "Salom hammaga!"
        }
        """
        if text_data is None:
            return

        data = json.loads(text_data)
        sender_id = data.get("sender_id")
        text = data.get("text")

        if not text or not sender_id:
            return

        # DB ga xabarni saqlaymiz
        message = await self.save_message(
            group_id=self.group_id,
            sender_id=sender_id,
            text=text
        )

        event = {
            "type": "chat_message",
            "id": message.id,
            "group": message.group_id,
            "sender": message.sender_id,
            "sender_name": message.sender.username,
            "text": message.text,
            "is_seen": message.is_seen,
            "created_at": message.created_at.isoformat(),
        }

        # Shu guruhdagi barcha ulanishlarga yuboramiz
        await self.channel_layer.group_send(
            self.room_group_name,
            event
        )

    async def chat_message(self, event):
        """
        group_send dan kelgan event'ni clientga yuborish
        """
        await self.send(text_data=json.dumps(event))

    # ==== DB funksiyalar ====

    @database_sync_to_async
    def save_message(self, group_id, sender_id, text):
        group = Group.objects.get(id=group_id)
        sender = User.objects.get(id=sender_id)
        return GroupMessage.objects.create(
            group=group,
            sender=sender,
            text=text
        )
