from rest_framework import serializers

from .models import Timetable, LessonSlot


class TimetableSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    semester_number = serializers.IntegerField(source="semester.number", read_only=True)

    class Meta:
        model = Timetable
        fields = "__all__"
        extra_kwargs = {
            "semester": {"required": False},
        }

    def validate(self, attrs):
        group = attrs.get("group") or getattr(self.instance, "group", None)
        semester = attrs.get("semester") or getattr(self.instance, "semester", None)
        if group and semester and group.semester_id and group.semester_id != semester.id:
            raise serializers.ValidationError(
                {"semester": "Semestr guruh semestriga mos emas."}
            )
        return attrs


class LessonSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    group_name = serializers.CharField(source="timetable.group.name", read_only=True)
    semester_number = serializers.IntegerField(source="timetable.semester.number", read_only=True)

    class Meta:
        model = LessonSlot
        fields = "__all__"
