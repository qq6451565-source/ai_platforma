import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from accounts.models import User
from profiles.models import StudentProfile

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
    from .models import LiveFaceSession, LiveParticipant

    ratio_threshold = float(getattr(settings, "FACE_ATTENDANCE_PRESENT_RATIO", 0.50))
    duration_ratio_threshold = float(getattr(settings, "LIVE_ATTENDANCE_MIN_DURATION_RATIO", 0.70))
    minimum_face_checks = int(getattr(settings, "FACE_ATTENDANCE_MIN_SAMPLES", 3) or 3)
    lesson = instance.lesson
    room_ended_at = instance.ended_at or timezone.now()

    sessions = (
        LiveFaceSession.objects
        .filter(room=instance, participant__is_teacher=False)
        .select_related("user")
    )
    session_map = {session.user_id: session for session in sessions}

    participants = (
        LiveParticipant.objects
        .filter(room=instance, user__role="student")
        .select_related("user")
    )
    participant_map = {participant.user_id: participant for participant in participants}

    for participant in participants:
        if participant.left_at is None:
            participant.mark_left(left_at=room_ended_at)

    group_student_ids = set(
        User.objects.filter(role="student", group_id=lesson.group_id)
        .values_list("id", flat=True)
    )
    group_student_ids.update(
        StudentProfile.objects.filter(group_id=lesson.group_id, status="active")
        .values_list("user_id", flat=True)
    )
    student_ids = sorted(group_student_ids.union(session_map.keys()).union(participant_map.keys()))
    student_map = User.objects.in_bulk(student_ids)

    for student_id in student_ids:
        user = student_map.get(student_id)
        if not user or getattr(user, "role", None) != "student":
            continue

        face_session = session_map.get(student_id)
        total = int(face_session.verification_count or 0) if face_session else 0
        ok = int(face_session.success_count or 0) if face_session else 0
        participant = participant_map.get(student_id)
        joined_seconds = participant.active_seconds(until=room_ended_at) if participant else 0

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
        attendance.joined_seconds = joined_seconds
        attendance.save(update_fields=["face_check_count", "face_success_count", "joined_seconds"])

        attendance.finalize(
            ratio_threshold=ratio_threshold,
            duration_ratio_threshold=duration_ratio_threshold,
            minimum_face_checks=minimum_face_checks,
            joined_seconds=joined_seconds,
        )

        logger.info(
            "Attendance finalized: student=%s lesson=%s joined_ratio=%.2f face_ratio=%.2f status=%s",
            user.username,
            lesson.id,
            attendance.joined_ratio,
            attendance.face_verified_ratio,
            attendance.status,
        )
