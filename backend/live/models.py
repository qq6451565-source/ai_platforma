
from django.db import models
from lessons.models import Lesson
from accounts.models import User

class LiveRoom(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='live_room')
    room_name = models.CharField(max_length=100, unique=True)
    jitsi_url = models.URLField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=False)
    stage_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stage_rooms',
    )
    allow_ptt = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        label = self.lesson.topic if getattr(self.lesson, "topic", None) else f"Lesson {self.lesson_id}"
        return f"LiveRoom {self.room_name} ({label})"


class LiveParticipant(models.Model):
    room = models.ForeignKey(LiveRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_teacher = models.BooleanField(default=False)
    hand_raised = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="unique_live_participant"),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.room.room_name}"
