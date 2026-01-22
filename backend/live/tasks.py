try:
    from celery import shared_task
except Exception:  # pragma: no cover - celery optional in dev
    def shared_task(func=None, **kwargs):
        if func is None:
            return lambda f: f
        return func

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
