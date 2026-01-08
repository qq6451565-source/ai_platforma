from django.core.mail import send_mail
from django.conf import settings
from accounts.models import User

def notify_student_email(student, subject, message):
    if not student.email:
        return
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [student.email],
        fail_silently=True,
    )

def notify_students_bulk(students, subject, message):
    emails = [s.email for s in students if s.email]
    if emails:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, emails, fail_silently=True)
