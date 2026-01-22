import os
from typing import List

from django.db import transaction
from rest_framework import serializers

from groups.models import Group
from teacher_subject.models import TeacherSubject

from .models import Material, MaterialResource

ALLOWED_MATERIAL_EXTENSIONS = {
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "mp4",
    "webm",
}


class MaterialResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialResource
        fields = [
            "id",
            "version",
            "resource_type",
            "title",
            "file",
            "url",
            "created_at",
        ]


class MaterialSerializer(serializers.ModelSerializer):
    lesson_topic = serializers.CharField(source="lesson.topic", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    group_ids = serializers.SerializerMethodField()
    group_names = serializers.SerializerMethodField()
    groups = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    resources = serializers.SerializerMethodField()
    versions = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = [
            "id",
            "title",
            "description",
            "lesson",
            "lesson_topic",
            "subject",
            "subject_name",
            "teacher",
            "teacher_name",
            "group",
            "group_name",
            "group_ids",
            "group_names",
            "groups",
            "material_type",
            "file",
            "current_version",
            "resources",
            "versions",
            "created_at",
            "updated_at",
        ]

    def get_group_ids(self, obj: Material) -> List[int]:
        ids = list(obj.groups.values_list("id", flat=True))
        if not ids and obj.group_id:
            ids = [obj.group_id]
        return ids

    def get_group_names(self, obj: Material) -> List[str]:
        names = list(obj.groups.values_list("name", flat=True))
        if not names and obj.group_id:
            names = [obj.group.name]
        return names

    def get_resources(self, obj: Material):
        qs = obj.resources.filter(version=obj.current_version).order_by("id")
        return MaterialResourceSerializer(qs, many=True).data

    def get_versions(self, obj: Material):
        versions = []
        all_versions = obj.resources.values_list("version", flat=True).distinct().order_by("version")
        for version in all_versions:
            resources = obj.resources.filter(version=version).order_by("id")
            versions.append({
                "version": version,
                "resources": MaterialResourceSerializer(resources, many=True).data,
            })
        return versions

    def _extract_list(self, request, key: str) -> List[str]:
        if not request:
            return []
        values = []
        if hasattr(request.data, "getlist"):
            values = request.data.getlist(key)
        if not values and key in request.data:
            raw = request.data.get(key)
            if isinstance(raw, list):
                values = raw
            elif isinstance(raw, str):
                raw = raw.strip()
                if raw:
                    values = [v.strip() for v in raw.replace("\r", "").split("\n") if v.strip()]
        return [v for v in values if v]

    def _extract_group_ids(self, attrs) -> List[int]:
        request = self.context.get("request")
        ids = []
        if request and hasattr(request.data, "getlist") and request.data.getlist("groups"):
            ids = request.data.getlist("groups")
        if not ids and "groups" in attrs:
            ids = attrs.pop("groups") or []
        if not ids and "group" in attrs:
            group = attrs.get("group")
            ids = [group.id if isinstance(group, Group) else group]
        cleaned = []
        for item in ids:
            try:
                cleaned.append(int(item))
            except (TypeError, ValueError):
                continue
        return cleaned

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        lesson = attrs.get("lesson") or getattr(self.instance, "lesson", None)
        group_ids = self._extract_group_ids(attrs)

        if lesson:
            if user and getattr(user, "role", None) == "teacher":
                if lesson.teacher_subject.teacher_id != user.id:
                    raise serializers.ValidationError({"lesson": "Bu dars sizga tegishli emas."})
            attrs["subject"] = lesson.teacher_subject.subject
            attrs["teacher"] = lesson.teacher_subject.teacher
            group_ids = [lesson.group_id]

        if user and getattr(user, "role", None) == "teacher":
            if "teacher" in attrs and attrs["teacher"] != user:
                raise serializers.ValidationError({"teacher": "O'qituvchi faqat o'zi uchun material qo'sha oladi."})

        teacher = attrs.get("teacher") or getattr(self.instance, "teacher", None) or (
            user if user and getattr(user, "role", None) == "teacher" else None
        )
        subject = attrs.get("subject") or getattr(self.instance, "subject", None)

        if not lesson and not subject:
            raise serializers.ValidationError({"subject": "Fan majburiy."})
        if not group_ids:
            raise serializers.ValidationError({"groups": "Kamida bitta guruh tanlang."})

        if teacher and subject and group_ids:
            allowed = set(
                TeacherSubject.objects.filter(
                    teacher=teacher,
                    subject=subject,
                    groups__in=group_ids,
                ).values_list("groups", flat=True)
            )
            missing = [gid for gid in group_ids if gid not in allowed]
            if missing:
                raise serializers.ValidationError(
                    {"groups": "O'qituvchi bu fan va guruhlarga biriktirilmagan."}
                )

        files = []
        if request and hasattr(request.FILES, "getlist"):
            files = request.FILES.getlist("files") or []
        if request and request.FILES.get("file"):
            files.append(request.FILES.get("file"))
        links = self._extract_list(request, "links")
        video_links = self._extract_list(request, "video_links")
        if links or video_links:
            raise serializers.ValidationError({"links": "Link yuklash vaqtincha o'chirilgan."})
        if not self.instance and not files:
            raise serializers.ValidationError({"files": "Fayl majburiy."})
        if files:
            invalid = []
            for f in files:
                name = getattr(f, "name", "") or ""
                ext = os.path.splitext(name)[1].lower().lstrip(".")
                if not ext or ext not in ALLOWED_MATERIAL_EXTENSIONS:
                    invalid.append(name or "unknown")
            if invalid:
                raise serializers.ValidationError(
                    {"files": "Ruxsat etilmagan fayl formati: " + ", ".join(invalid)}
                )

        attrs["_group_ids"] = group_ids
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        group_ids = validated_data.pop("_group_ids", [])
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user

        material = super().create(validated_data)
        if group_ids:
            material.groups.set(group_ids)
            if not material.group_id:
                material.group_id = group_ids[0]
                material.save(update_fields=["group"])

        files = request.FILES.getlist("files") if request else []
        if request and request.FILES.get("file"):
            files = files + [request.FILES.get("file")]
        version = material.current_version

        for f in files:
            MaterialResource.objects.create(
                material=material,
                version=version,
                resource_type="file",
                file=f,
                title=getattr(f, "name", ""),
            )
        return material

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        group_ids = validated_data.pop("_group_ids", None)
        if user and getattr(user, "role", None) == "teacher":
            validated_data["teacher"] = user

        instance = super().update(instance, validated_data)
        if group_ids is not None:
            instance.groups.set(group_ids)
            if group_ids:
                instance.group_id = group_ids[0]
            else:
                instance.group_id = None
            instance.save(update_fields=["group"])

        files = request.FILES.getlist("files") if request else []
        if request and request.FILES.get("file"):
            files = files + [request.FILES.get("file")]
        has_new = bool(files)
        if has_new:
            instance.current_version = (instance.current_version or 0) + 1
            instance.save(update_fields=["current_version"])
            version = instance.current_version
            for f in files:
                MaterialResource.objects.create(
                    material=instance,
                    version=version,
                    resource_type="file",
                    file=f,
                    title=getattr(f, "name", ""),
                )
        return instance
