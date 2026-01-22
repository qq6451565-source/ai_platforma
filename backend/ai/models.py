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
                "enable_presence": True,
                "enable_face_match": True,
                "presence_threshold": 0.6,
                "face_match_threshold": 0.7,
                "proctor_strict": True,
                "proctor_missing_seconds": 120,
            },
        )
        return obj
