from django.db.models.signals import post_save
from django.dispatch import receiver
from assignments.models import Assignment
from student_tests.models import StudentTest
from gradebook.models import GradebookEntry
from lessons.models import Lesson
from .services import notify_student_email


def assignment_created_notify(sender, instance, created, **kwargs):
    if created and getattr(instance, "student", None):
        notify_student_email(instance.student, "Yangi topshiriq", f"Yangi topshiriq: {instance.title}")


def test_created_notify(sender, instance, created, **kwargs):
    if created and getattr(instance, "student", None):
        notify_student_email(instance.student, "Yangi test", f"Yangi test: {instance.test.title}")


def grade_created_notify(sender, instance, created, **kwargs):
    if created and getattr(instance, "student", None):
        notify_student_email(instance.student, "Yangi baho", "Yangi baho kiritildi.")


def lesson_created_notify(sender, instance, created, **kwargs):
    if created and getattr(instance, "group", None):
        students = instance.group.user_set.filter(role="student")
        for student in students:
            notify_student_email(student, "Yangi dars", f"Yangi dars: {getattr(instance, 'topic', '')}")


post_save.connect(assignment_created_notify, sender=Assignment)
post_save.connect(test_created_notify, sender=StudentTest)
post_save.connect(grade_created_notify, sender=GradebookEntry)
post_save.connect(lesson_created_notify, sender=Lesson)
