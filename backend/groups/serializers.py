from rest_framework import serializers
from .models import Group


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'direction', 'language', 'level']
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
            "language": {"required": False, "allow_blank": True},
        }
