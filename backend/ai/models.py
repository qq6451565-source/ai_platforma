from django.conf import settings
from django.db import models


class AISettings(models.Model):
    """
    Admin boshqaradigan AI sozlamalari:
    - enable_presence: online dars/imtihonda yuzni aniqlash yoqilgan/yoqilmagan.
    - enable_face_match: pasport-selfie solishtirish yoqilgan/yoqilmagan.
    - thresholdlar: minimal ishonchlilik ko'rsatkichlari.
    - proctor_strict: test paytida verified bo'lmasa javob berishga ruxsat yo'q.
    - proctor_missing_seconds: yuz yo'q bo'lgan maksimal vaqt (soniya).
    """

    ai_enabled = models.BooleanField(default=True)
    api_base_url = models.CharField(max_length=255, blank=True, null=True)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    timeout_seconds = models.PositiveIntegerField(default=10)
    retry_count = models.PositiveIntegerField(default=1)
    ocr_confidence_threshold = models.FloatField(default=0.0)
    max_image_size_mb = models.FloatField(default=8.0)

    face_model = models.CharField(max_length=64, blank=True, null=True)
    detection_backend = models.CharField(max_length=64, blank=True, null=True)
    enforce_detection = models.BooleanField(default=False)

    enable_presence = models.BooleanField(default=True)
    enable_face_match = models.BooleanField(default=True)
    presence_threshold = models.FloatField(default=0.6)
    face_match_threshold = models.FloatField(default=0.7)
    proctor_strict = models.BooleanField(default=True)
    proctor_missing_seconds = models.PositiveIntegerField(default=120)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Settings"
        verbose_name_plural = "AI Settings"

    def __str__(self):
        return "AI Settings"

    @classmethod
    def get_active(cls):
        # Bitta yozuv kifoya. Yo'q bo'lsa, default bilan yaratamiz.
        obj, _ = cls.objects.get_or_create(
            id=1,
            defaults={
                "ai_enabled": getattr(settings, "AI_ENABLED", True),
                "api_base_url": getattr(settings, "AI_BASE_URL", None),
                "api_key": getattr(settings, "AI_API_KEY", None),
                "timeout_seconds": int(getattr(settings, "AI_TIMEOUT", 10)),
                "retry_count": int(getattr(settings, "AI_RETRY", 1)),
                "ocr_confidence_threshold": 0.0,
                "max_image_size_mb": 8.0,
                "face_model": None,
                "detection_backend": None,
                "enforce_detection": False,
                "enable_presence": True,
                "enable_face_match": True,
                "presence_threshold": 0.6,
                "face_match_threshold": 0.7,
                "proctor_strict": True,
                "proctor_missing_seconds": 120,
            },
        )
        return obj
