from rest_framework import serializers
from .models import GroupMessage


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = GroupMessage
        fields = [
            "id",
            "group",
            "sender",
            "sender_name",
            "text",
            "file",
            "is_seen",
            "created_at",
        ]
        read_only_fields = ("created_at", "is_seen", "sender")
