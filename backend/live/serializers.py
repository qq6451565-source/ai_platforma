from rest_framework import serializers

from .models import LiveRoom, LiveParticipant


class LiveRoomSerializer(serializers.ModelSerializer):
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    stage_user_id = serializers.IntegerField(source="stage_user_id", read_only=True)
    stage_user_name = serializers.CharField(source="stage_user.username", read_only=True)

    class Meta:
        model = LiveRoom
        fields = [
            "id",
            "lesson",
            "lesson_topic",
            "room_name",
            "jitsi_url",
            "is_active",
            "stage_user_id",
            "stage_user_name",
            "allow_ptt",
            "started_at",
            "ended_at",
        ]


class LiveParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = LiveParticipant
        fields = [
            "id",
            "room",
            "user",
            "user_name",
            "user_full_name",
            "user_role",
            "is_teacher",
            "hand_raised",
            "joined_at",
            "left_at",
        ]
