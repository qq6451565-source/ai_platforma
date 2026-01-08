from django.db import models

class Semester(models.Model):
    number = models.IntegerField()

    def __str__(self):
        return f"{self.number}-semester"


class SemesterSettings(models.Model):
    active_semester = models.ForeignKey(Semester, on_delete=models.PROTECT, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.active_semester:
            return f"Active: {self.active_semester.number}-semester"
        return "Active semester: unset"

    @classmethod
    def get_solo(cls):
        existing = cls.objects.first()
        if existing:
            return existing
        return cls.objects.create()

    @classmethod
    def get_active_semester(cls):
        settings = cls.get_solo()
        if settings.active_semester_id:
            return settings.active_semester
        semester = Semester.objects.order_by("number").first()
        if not semester:
            semester = Semester.objects.create(number=1)
        settings.active_semester = semester
        settings.save(update_fields=["active_semester", "updated_at"])
        return semester
