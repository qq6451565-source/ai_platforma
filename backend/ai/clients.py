import base64
import json
import urllib.error
import urllib.request

from django.conf import settings


def _ai_base():
    enabled = getattr(settings, "AI_ENABLED", False)
    base_url = getattr(settings, "AI_BASE_URL", None)
    if enabled and base_url:
        return base_url.rstrip("/")
    return None


def _post_json(path: str, payload: dict):
    base_url = _ai_base()
    if not base_url:
        return None

    url = f"{base_url}/{path.lstrip('/')}"
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    api_key = getattr(settings, "AI_API_KEY", None)
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    timeout = getattr(settings, "AI_TIMEOUT", 5)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content)
    except (urllib.error.URLError, ValueError):
        return None


def ocr_passport(image_bytes: bytes):
    """
    Passports OCR: yuborilgan faylni base64 qilib tashqi AI ga jo'natadi.
    """
    if not image_bytes:
        return None
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return _post_json(
        "ocr/passport",
        {"image_b64": b64},
    )


def face_match(passport_image: bytes, selfie_image: bytes):
    """
    Pasportdagi yuz va selfie ni solishtirish.
    """
    if not (passport_image and selfie_image):
        return None
    payload = {
        "passport_b64": base64.b64encode(passport_image).decode("utf-8"),
        "selfie_b64": base64.b64encode(selfie_image).decode("utf-8"),
    }
    return _post_json("face/match", payload)


def presence_check(session_id: str, frame_bytes: bytes):
    """
    Online dars/imtihonda yuz bor-yo'qligini aniqlash.
    """
    if not frame_bytes:
        return None
    payload = {
        "session_id": session_id,
        "frame_b64": base64.b64encode(frame_bytes).decode("utf-8"),
    }
    return _post_json("face/presence", payload)


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
