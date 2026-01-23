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
            "ai_enabled",
            "api_base_url",
            "api_key",
            "timeout_seconds",
            "retry_count",
            "ocr_confidence_threshold",
            "max_image_size_mb",
            "face_model",
            "detection_backend",
            "enforce_detection",
            "enable_presence",
            "enable_face_match",
            "presence_threshold",
            "face_match_threshold",
            "proctor_strict",
            "proctor_missing_seconds",
            "updated_at",
        ]
