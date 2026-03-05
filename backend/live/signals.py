import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import LiveRoom
from .tasks import send_live_reminder

logger = logging.getLogger(__name__)


@receiver(post_save, sender=LiveRoom)
def schedule_live_reminder(sender, instance, created, **kwargs):
    if created and instance.started_at:
        eta = instance.started_at - timedelta(minutes=10)
        if eta > timezone.now():
            if hasattr(send_live_reminder, "apply_async"):
                send_live_reminder.apply_async((instance.id,), eta=eta)


@receiver(post_save, sender=LiveRoom)
def finalize_attendance_on_room_close(sender, instance, created, **kwargs):
    """
    LiveRoom.is_active = False bo'lganda barcha talabalarning davomatini yakunlaydi.
    """
    if created:
        return
    # Faqat is_active False ga o'zganda ishlaydi
    update_fields = kwargs.get("update_fields")
    if update_fields is not None and "is_active" not in update_fields:
        return
    if instance.is_active:
        return  # Hali yopilmagan

    # Import shu yerda — sikliy import oldini olish
    from attendance.models import Attendance
    from .models import LiveFaceSession

    ratio_threshold = float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0.50))
    lesson = instance.lesson

    sessions = (
        LiveFaceSession.objects
        .filter(room=instance, participant__is_teacher=False)
        .select_related("user")
    )

    for face_session in sessions:
        user = face_session.user
        if getattr(user, "role", None) != "student":
            continue

        total = int(face_session.verification_count or 0)
        ok = int(face_session.success_count or 0)

        attendance, _ = Attendance.objects.get_or_create(
            lesson=lesson,
            student=user,
            defaults={"status": "absent"},
        )

        if attendance.finalized:
            continue

        # Hisob yuritish
        attendance.face_check_count = total
        attendance.face_success_count = ok
        attendance.save(update_fields=["face_check_count", "face_success_count"])

        attendance.finalize(ratio_threshold=ratio_threshold)

        logger.info(
            "Attendance finalized: student=%s lesson=%s ratio=%.2f status=%s",
            user.username,
            lesson.id,
            attendance.face_verified_ratio,
            attendance.status,
        )
