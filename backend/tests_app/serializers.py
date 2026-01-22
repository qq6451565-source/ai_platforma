from rest_framework import serializers
from decimal import Decimal, ROUND_DOWN
import random

from teacher_subject.models import TeacherSubject

from .models import Test, Question, Option


_POINTS_STEP = Decimal("0.01")


def _split_points(total_score: Decimal, count: int):
    if count <= 0:
        return []
    total = Decimal(total_score)
    base = (total / Decimal(count)).quantize(_POINTS_STEP, rounding=ROUND_DOWN)
    points = [base] * count
    remainder = (total - (base * count)).quantize(_POINTS_STEP, rounding=ROUND_DOWN)
    if remainder != Decimal("0.00"):
        points[-1] = (points[-1] + remainder).quantize(_POINTS_STEP, rounding=ROUND_DOWN)
    return points


class OptionStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text"]  # studentga is_correct bermaymiz


class QuestionStudentSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "text", "order", "points", "options"]

    def get_options(self, obj):
        options = list(obj.options.all().order_by("id"))
        student_test_id = self.context.get("student_test_id")
        seed = f"{student_test_id}:{obj.id}" if student_test_id else f"question:{obj.id}"
        random.Random(seed).shuffle(options)
        return OptionStudentSerializer(options, many=True).data


class TestStudentSerializer(serializers.ModelSerializer):
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    subject_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            "id", "title", "description",
            "lesson", "lesson_topic",
            "subject", "subject_name", "group", "group_name",
            "time_limit_minutes", "total_score",
            "is_active", "created_at",
        ]

    def get_subject_name(self, obj):
        if obj.subject_id and getattr(obj, "subject", None):
            return obj.subject.name
        lesson = getattr(obj, "lesson", None)
        if lesson and getattr(lesson, "teacher_subject", None):
            subject = lesson.teacher_subject.subject
            return subject.name if subject else None
        return None

    def get_group_name(self, obj):
        if obj.group_id and getattr(obj, "group", None):
            return obj.group.name
        lesson = getattr(obj, "lesson", None)
        group = getattr(lesson, "group", None) if lesson else None
        return group.name if group else None


# ===== Teacher/Admin uchun =====

class OptionTeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text", "is_correct"]


class QuestionTeacherSerializer(serializers.ModelSerializer):
    options = OptionTeacherSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "order", "points", "options"]

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        question = Question.objects.create(**validated_data)
        for opt in options_data:
            Option.objects.create(question=question, **opt)
        return question


class TestTeacherSerializer(serializers.ModelSerializer):
    questions = QuestionTeacherSerializer(many=True, required=False)
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    subject_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            "id", "title", "description",
            "lesson", "lesson_topic",
            "subject", "subject_name", "group", "group_name", "teacher",
            "time_limit_minutes", "total_score",
            "is_active", "created_at",
            "questions",
        ]
        extra_kwargs = {"total_score": {"required": True}}

    def get_subject_name(self, obj):
        if obj.subject_id and getattr(obj, "subject", None):
            return obj.subject.name
        lesson = getattr(obj, "lesson", None)
        if lesson and getattr(lesson, "teacher_subject", None):
            subject = lesson.teacher_subject.subject
            return subject.name if subject else None
        return None

    def get_group_name(self, obj):
        if obj.group_id and getattr(obj, "group", None):
            return obj.group.name
        lesson = getattr(obj, "lesson", None)
        group = getattr(lesson, "group", None) if lesson else None
        return group.name if group else None

    def validate_total_score(self, value):
        if value is None:
            raise serializers.ValidationError("Umumiy ball majburiy.")
        if value <= 0:
            raise serializers.ValidationError("Umumiy ball 0 dan katta bo'lishi kerak.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        lesson = attrs.get("lesson") or getattr(self.instance, "lesson", None)
        if lesson:
            attrs["subject"] = lesson.teacher_subject.subject
            attrs["group"] = lesson.group
            attrs["teacher"] = lesson.teacher_subject.teacher
            if user and getattr(user, "role", None) == "teacher":
                if lesson.teacher_subject.teacher_id != user.id:
                    raise serializers.ValidationError({"lesson": "Bu dars sizga tegishli emas."})
        teacher = attrs.get("teacher") or getattr(self.instance, "teacher", None)
        subject = attrs.get("subject") or getattr(self.instance, "subject", None)
        group = attrs.get("group") or getattr(self.instance, "group", None)

        if user and getattr(user, "role", None) == "teacher":
            if teacher and teacher != user:
                raise serializers.ValidationError({"teacher": "O'qituvchi faqat o'zi uchun test yarata oladi."})
            teacher = user

        if not lesson and not (subject and group):
            raise serializers.ValidationError({"lesson": "Dars yoki (fan + guruh) majburiy."})
        if teacher and subject and group:
            has_map = TeacherSubject.objects.filter(
                teacher=teacher,
                subject=subject,
                groups=group,
            ).exists()
            if not has_map:
                raise serializers.ValidationError(
                    {"group": "O'qituvchi bu fan va guruhga biriktirilmagan."}
                )
        return attrs

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        total_score = validated_data.get("total_score")
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        test = Test.objects.create(**validated_data)
        points_list = _split_points(total_score, len(questions_data)) if questions_data else []
        for idx, q in enumerate(questions_data):
            opts = q.pop("options", [])
            if points_list:
                q["points"] = points_list[idx]
            question = Question.objects.create(test=test, **q)
            for opt in opts:
                Option.objects.create(question=question, **opt)
        return test

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        instance = super().update(instance, validated_data)
        total_score = validated_data.get("total_score", instance.total_score)
        questions = list(instance.questions.order_by("order"))
        if questions:
            points_list = _split_points(total_score, len(questions))
            for idx, question in enumerate(questions):
                question.points = points_list[idx]
                question.save(update_fields=["points"])
        return instance


class QuestionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "test", "text", "order", "points"]


class OptionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "question", "text", "is_correct"]
