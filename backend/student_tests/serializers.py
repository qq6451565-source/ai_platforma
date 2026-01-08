from rest_framework import serializers
from .models import StudentTest, StudentAnswer


class StudentTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentTest
        fields = [
            "id", "student", "test",
            "started_at", "finished_at",
            "current_question_index",
            "score_percent", "is_finished",
        ]
        read_only_fields = ["started_at", "finished_at", "score_percent", "is_finished"]


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ["id", "student_test", "question", "selected_option", "is_correct", "answered_at"]
        read_only_fields = ["is_correct", "answered_at"]
