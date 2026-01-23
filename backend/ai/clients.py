import json
import logging
import mimetypes
import socket
import time
import uuid
import urllib.error
import urllib.request

from django.conf import settings
from django.db import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)


def _ai_base():
    ai_settings = _get_ai_settings()
    if ai_settings and ai_settings.ai_enabled and ai_settings.api_base_url:
        return ai_settings.api_base_url.rstrip("/")

    enabled = getattr(settings, "AI_ENABLED", False)
    base_url = getattr(settings, "AI_BASE_URL", None)
    if enabled and base_url:
        return base_url.rstrip("/")
    return None


def _get_ai_settings():
    try:
        from ai.models import AISettings
        return AISettings.get_active()
    except (OperationalError, ProgrammingError, Exception):
        return None


def _ai_api_key():
    ai_settings = _get_ai_settings()
    if ai_settings and ai_settings.api_key:
        return ai_settings.api_key
    return getattr(settings, "AI_API_KEY", None)


def _ai_timeout():
    ai_settings = _get_ai_settings()
    if ai_settings and ai_settings.timeout_seconds:
        return int(ai_settings.timeout_seconds)
    return int(getattr(settings, "AI_TIMEOUT", 5))


def _ai_retry():
    ai_settings = _get_ai_settings()
    if ai_settings is not None:
        return int(ai_settings.retry_count or 0)
    return int(getattr(settings, "AI_RETRY", 0))


def _post_json(path: str, payload: dict):
    base_url = _ai_base()
    if not base_url:
        return None

    url = f"{base_url}/{path.lstrip('/')}"
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    api_key = _ai_api_key()
    if api_key:
        headers["X-API-Key"] = api_key

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    timeout = _ai_timeout()
    return _read_json(req, timeout)


def _get_json(path: str):
    base_url = _ai_base()
    if not base_url:
        return None

    url = f"{base_url}/{path.lstrip('/')}"
    headers = {}
    api_key = _ai_api_key()
    if api_key:
        headers["X-API-Key"] = api_key

    req = urllib.request.Request(url, headers=headers, method="GET")
    timeout = _ai_timeout()
    return _read_json(req, timeout)


def _post_multipart(path: str, files: dict, data: dict | None = None):
    base_url = _ai_base()
    if not base_url:
        return None

    url = f"{base_url}/{path.lstrip('/')}"
    boundary = f"----aiBoundary{uuid.uuid4().hex}"
    body = bytearray()

    if data:
        for key, value in data.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
            body.extend(str(value).encode("utf-8"))
            body.extend(b"\r\n")

    for field_name, file_info in files.items():
        filename, file_bytes, content_type = file_info
        if not content_type:
            content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    headers = {"Content-Type": f"multipart/form-data; boundary={boundary}"}
    api_key = _ai_api_key()
    if api_key:
        headers["X-API-Key"] = api_key

    req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")
    timeout = _ai_timeout()
    return _read_json(req, timeout)


def _read_json(req: urllib.request.Request, timeout: int):
    retries = max(0, _ai_retry())
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content = resp.read().decode("utf-8")
                return json.loads(content)
        except (urllib.error.URLError, ValueError, TimeoutError, socket.timeout) as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))
                continue
    if last_exc:
        logger.warning("AI request failed after %s attempt(s): %s", retries + 1, last_exc)
    return None


def ocr_passport(image_bytes: bytes):
    """
    Passports OCR: yuborilgan faylni tashqi AI ga multipart orqali jo'natadi.
    """
    if not image_bytes:
        return None
    return _post_multipart(
        "ocr/passport",
        {"file": ("passport.jpg", image_bytes, "image/jpeg")},
    )


def face_match(passport_image: bytes, selfie_image: bytes):
    """
    Pasportdagi yuz va selfie ni solishtirish.
    """
    if not (passport_image and selfie_image):
        return None
    return _post_multipart(
        "face/match",
        {
            "passport_image": ("passport.jpg", passport_image, "image/jpeg"),
            "selfie_image": ("selfie.jpg", selfie_image, "image/jpeg"),
        },
    )


def presence_check(session_id: str, frame_bytes: bytes):
    """
    Online dars/imtihonda yuz bor-yo'qligini aniqlash.
    """
    if not frame_bytes:
        return None
    return _post_multipart(
        "face/presence",
        {"file": ("frame.jpg", frame_bytes, "image/jpeg")},
        {"session_id": session_id} if session_id else None,
    )


def material_qa(material, question: str):
    """
    Material bo'yicha savol-javob. Tashqi AI bo'lmasa None qaytaradi.
    """
    payload = {
        "material_id": material.id,
        "title": material.title,
        "question": question,
    }
    return _post_json("qa/material", payload)


def recommend_student(student, stats: dict):
    """
    Student uchun tavsiya. stats tayyorlangan metrikalar.
    """
    payload = {
        "student_id": student.id,
        "username": student.username,
        "group": getattr(getattr(student, "group", None), "name", None),
        "stats": stats,
    }
    return _post_json("recommend/student", payload)


def health_check():
    return _get_json("/")
