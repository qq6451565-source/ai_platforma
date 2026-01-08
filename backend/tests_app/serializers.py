from rest_framework import serializers

from teacher_subject.models import TeacherSubject

from .models import Test, Question, Option


class OptionStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text"]  # studentga is_correct bermaymiz


class QuestionStudentSerializer(serializers.ModelSerializer):
    options = OptionStudentSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "order", "points", "options"]


class TestStudentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Test
        fields = [
            "id", "title", "description",
            "subject", "subject_name",
            "group", "group_name",
            "time_limit_minutes", "pass_score",
            "is_active", "created_at",
        ]


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

    class Meta:
        model = Test
        fields = [
            "id", "title", "description",
            "subject", "group", "teacher",
            "time_limit_minutes", "pass_score",
            "is_active", "created_at",
            "questions",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        teacher = attrs.get("teacher") or getattr(self.instance, "teacher", None)
        subject = attrs.get("subject") or getattr(self.instance, "subject", None)
        group = attrs.get("group") or getattr(self.instance, "group", None)

        if user and getattr(user, "role", None) == "teacher":
            if teacher and teacher != user:
                raise serializers.ValidationError({"teacher": "O'qituvchi faqat o'zi uchun test yarata oladi."})
            teacher = user

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
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        test = Test.objects.create(**validated_data)
        for q in questions_data:
            opts = q.pop("options", [])
            question = Question.objects.create(test=test, **q)
            for opt in opts:
                Option.objects.create(question=question, **opt)
        return test

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user
        return super().update(instance, validated_data)


class QuestionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "test", "text", "order", "points"]


class OptionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "question", "text", "is_correct"]
