from rest_framework import serializers

from .models import AISettings


class MaterialQuestionSerializer(serializers.Serializer):
    material_id = serializers.IntegerField()
    question = serializers.CharField(max_length=1000)


class StudentRecommendationRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class AISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = [
            "id",
            "enable_presence",
            "enable_face_match",
            "presence_threshold",
            "face_match_threshold",
            "updated_at",
        ]
