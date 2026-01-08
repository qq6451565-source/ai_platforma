from celery import shared_task
from django.utils import timezone
from .models import LiveRoom
from profiles.services import notify_student_email

# LiveRoom boshlanishidan 10 daqiqa oldin studentlarga eslatma
def send_live_reminder(live_room_id):
    try:
        room = LiveRoom.objects.get(id=live_room_id)
        if not room.is_active:
            return
        students = room.lesson.group.user_set.filter(role='student')
        for student in students:
            notify_student_email(
                student,
                'Onlayn dars eslatmasi',
                f"{room.lesson.title} darsi {room.started_at.strftime('%H:%M')} da boshlanadi. Qo'shilish: {room.jitsi_url}"
            )
    except LiveRoom.DoesNotExist:
        pass
