from rest_framework import serializers

from subjects.models import Subject

from .models import Curriculum

class CurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curriculum
        fields = ['id', 'direction', 'semester', 'subjects']
        extra_kwargs = {
            "semester": {"required": False},
        }

    def validate(self, attrs):
        direction = attrs.get("direction") or getattr(self.instance, "direction", None)
        subjects = attrs.get("subjects")
        if direction is not None and subjects is not None:
            invalid = Subject.objects.filter(id__in=subjects).exclude(directions=direction)
            if invalid.exists():
                names = ", ".join(invalid.values_list("name", flat=True))
                raise serializers.ValidationError(
                    {"subjects": f"Tanlangan fanlar yo'nalishga mos emas: {names}"}
                )
        return attrs
