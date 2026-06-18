from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from tests_app.permissions import IsAdmin

import secrets
from .models import AISettings
from . import clients
from .serializers import AISettingsSerializer


class AISettingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        settings = AISettings.get_active()
        return Response(AISettingsSerializer(settings).data)

    def patch(self, request):
        settings = AISettings.get_active()
        serializer = AISettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)

    def post(self, request, *args, **kwargs):
        # API kalitini rotatsiya qilish uchun maxsus endpoint
        if kwargs.get('action') == 'rotate_api_key':
            settings = AISettings.get_active()
            new_key = secrets.token_urlsafe(32)
            settings.api_key = new_key
            settings.save()
            return Response({"api_key": new_key, "message": "API kaliti muvaffaqiyatli yangilandi."})
        return Response({"detail": "Unknown action."}, status=status.HTTP_400_BAD_REQUEST)


class AIHealthView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        ai_settings = AISettings.get_active()
        enabled = ai_settings.ai_enabled
        base_url = ai_settings.api_base_url or getattr(settings, "AI_BASE_URL", None)
        api_key_set = bool(ai_settings.api_key or getattr(settings, "AI_API_KEY", None))
        timeout = ai_settings.timeout_seconds or getattr(settings, "AI_TIMEOUT", 5)
        retry_count = ai_settings.retry_count

        payload = {
            "enabled": enabled,
            "base_url": base_url,
            "api_key_set": api_key_set,
            "timeout": timeout,
            "retry_count": retry_count,
            "ocr_confidence_threshold": ai_settings.ocr_confidence_threshold,
            "max_image_size_mb": ai_settings.max_image_size_mb,
            "face_model": ai_settings.face_model,
            "detection_backend": ai_settings.detection_backend,
            "enforce_detection": ai_settings.enforce_detection,
            "presence_threshold": ai_settings.presence_threshold,
            "face_match_threshold": ai_settings.face_match_threshold,
        }

        if not enabled:
            payload["status"] = "disabled"
            return Response(payload, status=status.HTTP_200_OK)

        if not base_url:
            payload["status"] = "unconfigured"
            return Response(payload, status=status.HTTP_200_OK)

        health = clients.health_check() or {}
        if not health.get("ok"):
            payload["status"] = "unreachable"
            payload["reason"] = health.get("reason", "connection_error")
            return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload["status"] = "ok"
        payload["gateway"] = {
            "endpoint": health.get("endpoint"),
            "data": health.get("data"),
        }
        return Response(payload, status=status.HTTP_200_OK)
