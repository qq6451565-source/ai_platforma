from rest_framework import serializers

from .models import GradebookEntry


class GradebookEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = GradebookEntry
        fields = "__all__"
