from __future__ import annotations

from collections.abc import Iterable

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from assignments.models import Assignment
from directions.models import Direction
from groups.models import Group
from lessons.models import Lesson
from profiles.models import StudentProfile, TeacherProfile
from subjects.models import Subject
from teacher_subject.models import TeacherSubject

from .models import User


def _default_admission_year() -> int:
    return timezone.now().year


def _validate_role(role: str) -> None:
    if role not in dict(User.ROLE_CHOICES):
        raise ValidationError({"role": "Role noto'g'ri."})


def _normalize_groups(groups: Iterable[Group] | None) -> list[Group]:
    if not groups:
        return []
    seen_ids: set[int] = set()
    normalized: list[Group] = []
    for group in groups:
        if group.id in seen_ids:
            continue
        seen_ids.add(group.id)
        normalized.append(group)
    return normalized


def _validate_student_mapping(direction: Direction | None, group: Group | None) -> None:
    if group and direction and group.direction_id != direction.id:
        raise ValidationError({"group": "Tanlangan guruh tanlangan yo'nalishga tegishli emas."})


def _validate_teacher_groups(subject: Subject, groups: list[Group]) -> None:
    if not groups:
        return
    allowed_direction_ids = set(subject.directions.values_list("id", flat=True))
    invalid_groups = [group.name for group in groups if group.direction_id not in allowed_direction_ids]
    if invalid_groups:
        raise ValidationError(
            {"groups": f"Tanlangan guruhlar fan yo'nalishiga mos emas: {', '.join(invalid_groups)}."}
        )


@transaction.atomic
def set_user_role(user: User, role: str) -> User:
    _validate_role(role)

    update_fields: list[str] = []
    if user.role != role:
        user.role = role
        update_fields.append("role")

    desired_staff = True if user.is_superuser else role == "admin"
    if user.is_staff != desired_staff:
        user.is_staff = desired_staff
        update_fields.append("is_staff")

    if role != "student" and user.group_id is not None:
        user.group = None
        update_fields.append("group")

    if update_fields:
        user.save(update_fields=update_fields)

    if role == "student":
        profile, _ = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                "direction": user.group.direction if user.group_id else None,
                "group": user.group,
                "admission_year": _default_admission_year(),
                "status": "active",
            },
        )
        profile_updates: list[str] = []
        if user.group_id and profile.group_id != user.group_id:
            profile.group = user.group
            profile_updates.append("group")
        resolved_direction = user.group.direction if user.group_id else profile.direction
        if resolved_direction and profile.direction_id != resolved_direction.id:
            profile.direction = resolved_direction
            profile_updates.append("direction")
        if not profile.admission_year:
            profile.admission_year = _default_admission_year()
            profile_updates.append("admission_year")
        if not profile.status:
            profile.status = "active"
            profile_updates.append("status")
        if profile_updates:
            profile.save(update_fields=profile_updates)

    if role == "teacher":
        TeacherProfile.objects.get_or_create(user=user)

    return user


@transaction.atomic
def upsert_student_placement(
    user: User,
    *,
    group: Group | None,
    direction: Direction | None,
    admission_year: int | None,
    status: str | None,
) -> StudentProfile:
    if status and status not in dict(StudentProfile.STATUS_CHOICES):
        raise ValidationError({"status": "Talaba statusi noto'g'ri."})

    resolved_direction = direction or (group.direction if group else None)
    _validate_student_mapping(resolved_direction, group)

    set_user_role(user, "student")

    profile, _ = StudentProfile.objects.get_or_create(
        user=user,
        defaults={
            "direction": resolved_direction,
            "group": group,
            "admission_year": admission_year or _default_admission_year(),
            "status": status or "active",
        },
    )

    profile.direction = resolved_direction
    profile.group = group
    profile.admission_year = admission_year or profile.admission_year or _default_admission_year()
    profile.status = status or profile.status or "active"
    profile.save()

    if user.group_id != (group.id if group else None):
        user.group = group
        user.save(update_fields=["group"])

    return profile


@transaction.atomic
def upsert_teacher_workload(
    user: User,
    *,
    subject: Subject,
    groups: Iterable[Group] | None = None,
    instance: TeacherSubject | None = None,
) -> tuple[TeacherSubject, bool]:
    normalized_groups = _normalize_groups(groups)
    _validate_teacher_groups(subject, normalized_groups)

    set_user_role(user, "teacher")
    TeacherProfile.objects.get_or_create(user=user)

    if instance is None:
        mapping = TeacherSubject.objects.filter(teacher=user, subject=subject).first()
        created = mapping is None
        if mapping is None:
            mapping = TeacherSubject.objects.create(teacher=user, subject=subject)
    else:
        duplicate_exists = (
            TeacherSubject.objects.filter(teacher=user, subject=subject)
            .exclude(id=instance.id)
            .exists()
        )
        if duplicate_exists:
            raise ValidationError(
                {"non_field_errors": ["Bu o'qituvchi va fan birikmasi allaqachon mavjud."]}
            )

        mapping = instance
        created = False
        update_fields: list[str] = []
        if mapping.teacher_id != user.id:
            mapping.teacher = user
            update_fields.append("teacher")
        if mapping.subject_id != subject.id:
            mapping.subject = subject
            update_fields.append("subject")
        if update_fields:
            mapping.save(update_fields=update_fields)

    mapping.groups.set([group.id for group in normalized_groups])
    return mapping, created


@transaction.atomic
def merge_teacher_subjects(primary: TeacherSubject, duplicate: TeacherSubject) -> TeacherSubject:
    if primary.id == duplicate.id:
        return primary

    merged_group_ids = sorted(
        set(primary.groups.values_list("id", flat=True))
        | set(duplicate.groups.values_list("id", flat=True))
    )
    if merged_group_ids:
        primary.groups.set(merged_group_ids)

    Lesson.objects.filter(teacher_subject=duplicate).update(teacher_subject=primary)
    Assignment.objects.filter(teacher_subject=duplicate).update(teacher_subject=primary)
    duplicate.delete()
    return primary
