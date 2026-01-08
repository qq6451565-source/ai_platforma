import cv2
import easyocr
import numpy as np
import re
from loguru import logger

# EasyOCR modelini yaratish (faqat bir marta yuklanadi, CPU)
reader = easyocr.Reader(['en'], gpu=False)


def extract_passport_data(image_bytes, ocr_threshold: float = 0.0):
    """
    Passport rasmdan ma'lumotlarni o'qiydi va JSON qaytaradi:
    {
        "passport_id": "...",
        "fio": "...",
        "birthdate": "...",
        "confidence": 0.x
    }
    """
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    if img is None:
        return {"passport_id": None, "fio": None, "birthdate": None, "confidence": 0.0}

    results = reader.readtext(img)

    text_data = []
    total_confidence = 0
    word_count = 0

    for _, text, conf in results:
        if conf < ocr_threshold:
            continue
        text_data.append((text, conf))
        total_confidence += conf
        word_count += 1

    avg_confidence = total_confidence / word_count if word_count > 0 else 0

    passport_id = extract_field(text_data, r'^[A-Z0-9]{2,20}$')  # Masalan: AB1234567
    fio = extract_name(text_data)
    birthdate = extract_birth_date(text_data)

    return {
        "passport_id": passport_id or None,
        "fio": fio or None,
        "birthdate": birthdate or None,
        "confidence": round(avg_confidence, 2)
    }


def extract_field(data, pattern):
    for text, _ in data:
        if re.match(pattern, text.upper()):
            return text
    return None


def extract_name(data):
    names = []
    for text, _ in data:
        if text.isalpha() and len(text) > 2:
            names.append(text)
    if len(names) >= 2:
        return " ".join(names[:2])
    return None


def extract_birth_date(data):
    for text, _ in data:
        match = re.search(r'\b(\d{2}[./-]\d{2}[./-]\d{4})\b', text)
        if match:
            return match.group(1)
    return None
