from django.db import models
from django.utils import timezone

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
    accumulated_seconds = models.PositiveIntegerField(default=0)
    is_teacher = models.BooleanField(default=False)
    hand_raised = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="unique_live_participant"),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.room.room_name}"

    def active_seconds(self, until=None) -> int:
        total = int(self.accumulated_seconds or 0)
        if self.left_at is None and self.joined_at:
            finished_at = until or timezone.now()
            if finished_at > self.joined_at:
                total += int((finished_at - self.joined_at).total_seconds())
        return max(total, 0)

    def mark_joined(self, *, joined_at=None, is_teacher=None) -> None:
        joined_at = joined_at or timezone.now()
        update_fields = []

        if self.left_at is not None:
            self.joined_at = joined_at
            self.left_at = None
            update_fields.extend(["joined_at", "left_at"])

        if is_teacher is not None and self.is_teacher != is_teacher:
            self.is_teacher = is_teacher
            update_fields.append("is_teacher")

        if update_fields:
            self.save(update_fields=update_fields)

    def mark_left(self, *, left_at=None) -> None:
        left_at = left_at or timezone.now()
        update_fields = []

        if self.left_at is None:
            self.accumulated_seconds = self.active_seconds(until=left_at)
            self.left_at = left_at
            update_fields.extend(["accumulated_seconds", "left_at"])

        if self.hand_raised:
            self.hand_raised = False
            update_fields.append("hand_raised")

        if update_fields:
            self.save(update_fields=update_fields)


class FaceVerificationSettings(models.Model):
    """Global settings for face verification system."""
    
    verification_enabled = models.BooleanField(default=True)
    verification_interval = models.IntegerField(default=5, help_text="Verification interval in seconds")
    confidence_threshold = models.FloatField(default=0.80, help_text="Minimum confidence for verification (cosine mapped to [0,1]; 0.80 ≈ raw cosine 0.60)")
    max_faces_allowed = models.IntegerField(default=1, help_text="Maximum faces allowed in frame")
    auto_attendance = models.BooleanField(default=True, help_text="Automatically mark attendance on verification")
    alert_on_multiple_faces = models.BooleanField(default=True)
    alert_on_no_face = models.BooleanField(default=True)
    alert_on_verification_fail = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Face Verification Settings"
        verbose_name_plural = "Face Verification Settings"
    
    def __str__(self):
        return f"Face Verification Settings (Updated: {self.updated_at})"
    
    @classmethod
    def get_settings(cls):
        """Get or create singleton settings instance."""
        settings, _ = cls.objects.get_or_create(id=1)
        return settings


class LiveFaceSession(models.Model):
    """Tracks face verification session for a participant in a live room."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('verified', 'Verified'),
        ('failed', 'Failed'),
        ('ended', 'Ended'),
    ]
    
    participant = models.ForeignKey(
        LiveParticipant,
        on_delete=models.CASCADE,
        related_name='face_sessions'
    )
    room = models.ForeignKey(
        LiveRoom,
        on_delete=models.CASCADE,
        related_name='face_sessions'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='face_sessions'
    )
    
    reference_embedding = models.JSONField(
        help_text="Face embedding from enrollment/profile",
        null=True,
        blank=True
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_verification_at = models.DateTimeField(null=True, blank=True)
    verification_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    fail_count = models.IntegerField(default=0)
    
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = [['participant', 'room']]
        ordering = ['-started_at']
    
    def __str__(self):
        return f"FaceSession: {self.user.username} in {self.room.room_name}"
    
    @property
    def success_rate(self):
        if self.verification_count == 0:
            return 0.0
        return (self.success_count / self.verification_count) * 100


class LiveFaceEvent(models.Model):
    """Individual face verification event/check."""
    
    EVENT_TYPES = [
        ('verification', 'Verification'),
        ('multiple_faces', 'Multiple Faces Detected'),
        ('no_face', 'No Face Detected'),
        ('low_confidence', 'Low Confidence'),
        ('success', 'Verification Success'),
        ('failure', 'Verification Failure'),
    ]
    
    session = models.ForeignKey(
        LiveFaceSession,
        on_delete=models.CASCADE,
        related_name='events'
    )
    room = models.ForeignKey(
        LiveRoom,
        on_delete=models.CASCADE,
        related_name='face_events'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='face_events'
    )
    
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    
    faces_detected = models.IntegerField(default=0)
    confidence = models.FloatField(null=True, blank=True, help_text="Verification confidence score")
    frame_embedding = models.JSONField(null=True, blank=True, help_text="Embedding from current frame")
    
    is_verified = models.BooleanField(default=False)
    alert_sent = models.BooleanField(default=False)
    
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional event data")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['session', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.user.username} @ {self.created_at}"
