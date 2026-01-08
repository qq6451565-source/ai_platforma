from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LiveRoom
from .tasks import send_live_reminder
from django.utils import timezone
from datetime import timedelta

@receiver(post_save, sender=LiveRoom)
def schedule_live_reminder(sender, instance, created, **kwargs):
    if created and instance.started_at:
        eta = instance.started_at - timedelta(minutes=10)
        if eta > timezone.now():
            send_live_reminder.apply_async((instance.id,), eta=eta)
