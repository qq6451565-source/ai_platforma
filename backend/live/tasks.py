try:
    from celery import shared_task
except Exception:  # pragma: no cover - celery optional in dev
    def shared_task(func=None, **kwargs):
        if func is None:
            return lambda f: f
        return func

import uuid

from django.utils import timezone

from lessons.models import Lesson

from .models import LiveRoom
from profiles.models import StudentProfile
from profiles.services import notify_student_email


@shared_task
def send_live_reminder(live_room_id):
    try:
        room = LiveRoom.objects.select_related("lesson", "lesson__group").get(id=live_room_id)
    except LiveRoom.DoesNotExist:
        return

    if not room.is_active or not room.started_at:
        return

    students = (
        StudentProfile.objects.select_related("user")
        .filter(group=room.lesson.group, status="active")
        .all()
    )
    title = room.lesson.topic if getattr(room.lesson, "topic", None) else "Onlayn dars"
    for profile in students:
        notify_student_email(
            profile.user,
            "Onlayn dars eslatmasi",
            f"{title} darsi {room.started_at.strftime('%H:%M')} da boshlanadi. Qo'shilish: {room.jitsi_url or ''}",
        )


def _build_room_code(lesson: Lesson) -> str:
    return f"lesson_{lesson.id}_{uuid.uuid4().hex[:6]}"


def sync_live_rooms(now=None) -> dict:
    """
    Dars vaqti bo'lsa - xonani avtomatik yaratadi/yoqadi,
    dars tugasa - xonani avtomatik yopadi.
    """
    if now is None:
        now = timezone.now()

    created = 0
    activated = 0
    closed = 0

    # Dars vaqti boshlangan xonalar
    lessons = Lesson.objects.filter(start_time__lte=now, end_time__gte=now)
    for lesson in lessons:
        room, was_created = LiveRoom.objects.get_or_create(
            lesson=lesson,
            defaults={
                "room_name": _build_room_code(lesson),
                "jitsi_url": None,
                "is_active": True,
                "started_at": now,
            },
        )
        if was_created:
            created += 1
        changed = False
        if not room.room_name:
            room.room_name = _build_room_code(lesson)
            changed = True
        if not room.jitsi_url:
            room.jitsi_url = f"https://meet.jit.si/{room.room_name}"
            changed = True
        if not room.is_active:
            room.is_active = True
            room.started_at = now
            room.ended_at = None
            changed = True
            activated += 1
        if changed:
            room.save()

    # Dars tugagan xonalarni yopamiz
    rooms_to_close = LiveRoom.objects.filter(is_active=True, lesson__end_time__lt=now)
    for room in rooms_to_close:
        room.is_active = False
        room.ended_at = now
        room.save(update_fields=["is_active", "ended_at"])
        closed += 1

    return {"created": created, "activated": activated, "closed": closed}
