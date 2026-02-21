import logging
import time
import requests

from django.conf import settings
from django.db import OperationalError, ProgrammingError

logger = logging.getLogger(__name__)

# Maxsus xatoliklar
class AIError(Exception):
    """Umumiy AI xatoligi"""
    pass

class AIConnectionError(AIError):
    """Ulanish bilan bog'liq xatolar (Timeout, Connection refused)"""
    def __init__(self, message: str, *, reason: str = "connection_error", status_code: int | None = None):
        super().__init__(message)
        self.reason = reason
        self.status_code = status_code


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
    return int(getattr(settings, "AI_TIMEOUT", 60))


def _ai_retry():
    ai_settings = _get_ai_settings()
    if ai_settings is not None:
        return int(ai_settings.retry_count or 0)
    return int(getattr(settings, "AI_RETRY", 0))


def _request(method: str, path: str, *, timeout_override: int | None = None, retries_override: int | None = None, **kwargs):
    """
    Requests kutubxonasi orqali so'rov yuborish uchun universal funksiya.
    Retry va Timeout logikasini o'z ichiga oladi.
    """
    base_url = _ai_base()
    if not base_url:
        logger.error("AI Base URL sozlanmagan.")
        return None

    url = f"{base_url}/{path.lstrip('/')}"
    headers = kwargs.pop("headers", {})
    api_key = _ai_api_key()
    if api_key:
        headers["X-API-Key"] = api_key

    timeout = int(timeout_override if timeout_override is not None else _ai_timeout())
    retries = max(0, int(retries_override if retries_override is not None else _ai_retry()))

    for attempt in range(retries + 1):
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                timeout=timeout,
                **kwargs
            )
            
            # Agar 4xx xato bo'lsa (masalan, rasm yomon), darhol xabar beramiz
            if 400 <= response.status_code < 500:
                reason = _status_reason(response.status_code)
                try:
                    error_detail = response.json()
                except ValueError:
                    error_detail = response.text
                logger.warning(f"AI Client Error ({response.status_code}): {error_detail}")
                if response.status_code in (401, 403, 408, 429):
                    raise AIConnectionError(
                        f"AI service returned {response.status_code}",
                        reason=reason,
                        status_code=response.status_code,
                    )
                # 4xx validation xatolar uchun retry qilinmaydi, chunki so'rov noto'g'ri
                return None

            # Boshqa xatolar (5xx) uchun exception ko'tarib, retry ga o'tamiz
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.warning(f"AI Request Failed (Attempt {attempt+1}/{retries+1}): {e}")
            if attempt < retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            else:
                logger.error(f"AI Service Unreachable after retries: {e}")
                # View ga 503 qaytarish uchun signal
                raise AIConnectionError(
                    f"AI Service unavailable: {e}",
                    reason=_request_exception_reason(e),
                )
        except Exception as e:
            logger.exception(f"Unexpected error in AI client: {e}")
            return None
            
    return None


def _status_reason(status_code: int) -> str:
    if status_code in (401, 403):
        return "auth_error"
    if status_code in (408,):
        return "timeout"
    if status_code in (429,):
        return "rate_limited"
    if status_code >= 500:
        return "gateway_error"
    return "validation_error"


def _request_exception_reason(exc: Exception) -> str:
    if isinstance(exc, requests.exceptions.HTTPError):
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code in (401, 403):
            return "auth_error"
        if status_code == 429:
            return "rate_limited"
        if status_code == 408:
            return "timeout"
        if status_code and status_code >= 500:
            return "gateway_error"
    if isinstance(exc, (requests.exceptions.Timeout, requests.exceptions.ReadTimeout)):
        return "timeout"
    if isinstance(exc, requests.exceptions.SSLError):
        return "ssl_error"
    if isinstance(exc, requests.exceptions.ConnectionError):
        text = str(exc).lower()
        if "name or service not known" in text or "nodename nor servname" in text:
            return "dns_error"
        return "connection_error"
    return "connection_error"


def _prepare_file(file_obj, filename="image.jpg", content_type="image/jpeg"):
    """Fayl obyekti yoki baytlarni requests uchun tayyorlaydi."""
    if hasattr(file_obj, "read"):
        # Bu Django UploadedFile yoki ochiq fayl
        return (file_obj.name, file_obj, file_obj.content_type)
    # Bu shunchaki bytes
    return (filename, file_obj, content_type)


def ocr_passport(image_data, *, timeout_override: int | None = None, retries_override: int | None = None):
    """
    Passports OCR: yuborilgan faylni tashqi AI ga multipart orqali jo'natadi.
    """
    if not image_data:
        return None
    
    files = {"file": _prepare_file(image_data, "passport.jpg")}
    return _request(
        "POST",
        "ocr/passport",
        files=files,
        timeout_override=timeout_override,
        retries_override=retries_override,
    )


def face_match(
    passport_data,
    selfie_data,
    *,
    timeout_override: int | None = None,
    retries_override: int | None = None,
):
    """
    Pasportdagi yuz va selfie ni solishtirish.
    """
    if not (passport_data and selfie_data):
        return None
        
    files = {
        "passport_image": _prepare_file(passport_data, "passport.jpg"),
        "selfie_image": _prepare_file(selfie_data, "selfie.jpg"),
    }
    return _request(
        "POST",
        "face/match",
        files=files,
        timeout_override=timeout_override,
        retries_override=retries_override,
    )


def presence_check(session_id: str, frame_data):
    """
    Online dars/imtihonda yuz bor-yo'qligini aniqlash.
    """
    if not frame_data:
        return None
        
    files = {"file": _prepare_file(frame_data, "frame.jpg")}
    data = {"session_id": session_id} if session_id else None
    
    return _request("POST", "face/presence", files=files, data=data)


def face_analyze(image_data):
    """
    Yuzlarni aniqlash va embedding olish.
    """
    if not image_data:
        return None

    files = {"file": _prepare_file(image_data, "face.jpg")}
    return _request("POST", "face/analyze", files=files)


def face_quality(image_data):
    """
    Yuz sifati tekshiruvi (yorug'lik, tiniqlik, masofa).
    """
    if not image_data:
        return None

    files = {"file": _prepare_file(image_data, "face.jpg")}
    return _request("POST", "face/quality", files=files)


def face_liveness(image_data):
    """
    Single-frame liveness tekshiruvi.
    """
    if not image_data:
        return None

    files = {"file": _prepare_file(image_data, "face.jpg")}
    return _request("POST", "face/liveness", files=files)


def face_blink(image_data):
    """
    Blink aniqlash endpointi.
    """
    if not image_data:
        return None

    files = {"file": _prepare_file(image_data, "face.jpg")}
    return _request("POST", "face/blink", files=files)


def health_check():
    timeout = max(3, min(10, _ai_timeout()))
    last_error = None
    for endpoint in ("/health", "/ready", "/"):
        try:
            data = _request("GET", endpoint, timeout_override=timeout, retries_override=0)
            if data is not None:
                return {"ok": True, "endpoint": endpoint, "data": data}
        except AIConnectionError as exc:
            last_error = exc
            continue
    if last_error is not None:
        return {"ok": False, "reason": getattr(last_error, "reason", "connection_error")}
    return {"ok": False, "reason": "gateway_unreachable"}
