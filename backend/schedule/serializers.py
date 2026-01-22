from rest_framework import serializers

from .models import Timetable, LessonSlot


class TimetableSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Timetable
        fields = "__all__"


class LessonSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    group_name = serializers.CharField(source="timetable.group.name", read_only=True)

    class Meta:
        model = LessonSlot
        fields = "__all__"
