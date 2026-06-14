"""
assignments/signals.py

Submission saqlanganda (yaratilganda) tegishli LessonActivityLog ni yangilaydi.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Submission


@receiver(post_save, sender=Submission)
def update_activity_log_on_submission(sender, instance: Submission, created: bool, **kwargs):
    """
    Talaba topshiriq yuborsa, darsga bog'liq LessonActivityLog yangilanadi.
    """
    if not created:
        return  # faqat yangi submission hisobga olinadi

    lesson = getattr(instance.assignment, "lesson", None)
    if not lesson:
        return

    try:
        from attendance.models import LessonActivityLog
        log, _ = LessonActivityLog.objects.get_or_create(
            lesson=lesson,
            student=instance.student,
        )
        if not log.assignment_submitted:
            log.assignment_submitted = True
            log.assignment_submitted_at = timezone.now()
            log.save_computed()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "activity_log submission update xato student=%s lesson=%s: %s",
            instance.student_id, lesson.id, exc,
        )
