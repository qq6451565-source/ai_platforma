from rest_framework import serializers

from .models import ProctorSession, ProctorEvent


class ProctorSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctorSession
        fields = "__all__"


class ProctorEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctorEvent
        fields = "__all__"
