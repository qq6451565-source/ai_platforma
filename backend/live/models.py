
from django.db import models
from lessons.models import Lesson
from accounts.models import User
from lessons.models import Lesson
from accounts.models import User

class LiveRoom(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='live_room')
    room_name = models.CharField(max_length=100, unique=True)
    jitsi_url = models.URLField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"LiveRoom {self.room_name} ({self.lesson.topic})"


class LiveParticipant(models.Model):
    room = models.ForeignKey(LiveRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_teacher = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} in {self.room.room_name}"
