"""
student_tests/signals.py

StudentTest yakunlanganida (is_finished=True) tegishli LessonActivityLog
yozuvini avtomatik yangilaydi.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import StudentTest


@receiver(post_save, sender=StudentTest)
def update_activity_log_on_test_finish(sender, instance: StudentTest, **kwargs):
    """
    Test yakunlangach (is_finished=True) darsga bog'liq LessonActivityLog ni yangilaydi.
    Test lesson'ga biriktirilmagan bo'lsa — hech narsa qilmaydi.
    """
    if not instance.is_finished:
        return

    lesson = getattr(instance.test, "lesson", None)
    if not lesson:
        return

    try:
        from attendance.models import LessonActivityLog
        log, _ = LessonActivityLog.objects.get_or_create(
            lesson=lesson,
            student=instance.student,
        )
        # Test natijasini yangilash (takroriy ishlanmagan holda ham yangilaydi)
        log.test_attended = True
        log.test_score = float(instance.score_percent or 0.0)
        log.save_computed()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "activity_log test update xato student=%s lesson=%s: %s",
            instance.student_id, lesson.id, exc,
        )
