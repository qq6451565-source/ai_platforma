from rest_framework import serializers
from accounts.models import User
from lessons.models import Lesson
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['id', 'lesson', 'student', 'status', 'timestamp']


class MarkAttendanceSerializer(serializers.Serializer):
    lesson = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all())
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="student"))
    status = serializers.ChoiceField(choices=Attendance.ATTEND_CHOICES)
