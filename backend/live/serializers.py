from rest_framework import serializers

from .models import LiveRoom, LiveParticipant


class LiveRoomSerializer(serializers.ModelSerializer):
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)

    class Meta:
        model = LiveRoom
        fields = [
            "id",
            "lesson",
            "lesson_topic",
            "room_name",
            "jitsi_url",
            "is_active",
            "started_at",
            "ended_at",
        ]


class LiveParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LiveParticipant
        fields = [
            "id",
            "room",
            "user",
            "user_name",
            "is_teacher",
            "joined_at",
            "left_at",
        ]
