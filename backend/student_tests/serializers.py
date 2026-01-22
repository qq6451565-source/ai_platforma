from rest_framework import serializers
from .models import StudentTest, StudentAnswer


class StudentTestSerializer(serializers.ModelSerializer):
    test_title = serializers.CharField(source="test.title", read_only=True)
    test_total_score = serializers.DecimalField(
        source="test.total_score",
        max_digits=7,
        decimal_places=2,
        read_only=True,
    )
    lesson_topic = serializers.CharField(source="test.lesson.topic", read_only=True)
    subject_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentTest
        fields = [
            "id", "student", "test",
            "test_title", "test_total_score", "lesson_topic", "subject_name", "group_name",
            "started_at", "finished_at",
            "current_question_index",
            "score_percent", "is_finished",
        ]
        read_only_fields = ["started_at", "finished_at", "is_finished"]

    def get_subject_name(self, obj):
        test = getattr(obj, "test", None)
        if test and getattr(test, "subject_id", None) and getattr(test, "subject", None):
            return test.subject.name
        lesson = getattr(test, "lesson", None) if test else None
        teacher_subject = getattr(lesson, "teacher_subject", None) if lesson else None
        subject = getattr(teacher_subject, "subject", None) if teacher_subject else None
        return subject.name if subject else None

    def get_group_name(self, obj):
        test = getattr(obj, "test", None)
        if test and getattr(test, "group_id", None) and getattr(test, "group", None):
            return test.group.name
        lesson = getattr(test, "lesson", None) if test else None
        group = getattr(lesson, "group", None) if lesson else None
        return group.name if group else None

    def validate_score_percent(self, value):
        if value is None:
            return value
        if value < 0 or value > 100:
            raise serializers.ValidationError("Test balli umumiy baldan oshmasligi kerak.")
        return value


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ["id", "student_test", "question", "selected_option", "is_correct", "answered_at"]
        read_only_fields = ["is_correct", "answered_at"]
