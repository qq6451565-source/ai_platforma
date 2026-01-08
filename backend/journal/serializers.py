from rest_framework import serializers
from .models import JournalRecord


class JournalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalRecord
        fields = [
            'id',
            'lesson',
            'student',
            'group',
            'attendance',
            'grade',
            'comment',
            'date'
        ]
