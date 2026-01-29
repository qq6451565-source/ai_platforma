import os

import cv2
import numpy as np
from deepface import DeepFace
from loguru import logger

MODEL_NAME = os.getenv("FACE_MODEL", "Facenet512")
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "opencv")  # retinaface, mtcnn, opencv, mediapipe, ssd, yolo, dlib, centerface
ENFORCE_DETECTION = os.getenv("FACE_ENFORCE_DETECTION", "false").lower() in ("1", "true", "yes", "on")

MIN_FACE_AREA = int(os.getenv("FACE_MIN_AREA", "2500"))


def _extract_primary_face(img: np.ndarray) -> np.ndarray:
    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            detector_backend=DETECTION_BACKEND,
            enforce_detection=ENFORCE_DETECTION,
            align=True,
        )
    except Exception as exc:
        logger.warning(f"Face detection failed: {exc}")
        return img
    if not faces:
        return img
    best = max(
        faces,
        key=lambda item: item.get("facial_area", {}).get("w", 0) * item.get("facial_area", {}).get("h", 0),
    )
    area = best.get("facial_area") or {}
    x = int(area.get("x", 0))
    y = int(area.get("y", 0))
    w = int(area.get("w", 0))
    h = int(area.get("h", 0))
    if w <= 0 or h <= 0 or w * h < MIN_FACE_AREA:
        return img
    h_img, w_img = img.shape[:2]
    x2 = min(w_img, x + w)
    y2 = min(h_img, y + h)
    x = max(0, x)
    y = max(0, y)
    crop = img[y:y2, x:x2]
    return crop if crop.size else img



def compare_faces(passport_image_bytes, selfie_image_bytes) -> float:
    """
    Passport rasmi va selfie rasmini solishtiradi.
    Chiqish: confidence (0..1). Thresholdni main.py qo'llaydi.
    """
    try:
        # Rasm bytes'larini numpy arrayga o'tkazish (RAMda saqlab, diskga yozmaymiz)
        passport_img = cv2.imdecode(np.frombuffer(passport_image_bytes, np.uint8), cv2.IMREAD_COLOR)
        selfie_img = cv2.imdecode(np.frombuffer(selfie_image_bytes, np.uint8), cv2.IMREAD_COLOR)

        if passport_img is None or selfie_img is None:
            logger.error("Image decode failed (passport or selfie is None)")
            return 0.0

        passport_img = _extract_primary_face(passport_img)
        selfie_img = _extract_primary_face(selfie_img)

        result = DeepFace.verify(
            img1_path=passport_img,
            img2_path=selfie_img,
            model_name=MODEL_NAME,
            detector_backend=DETECTION_BACKEND,
            enforce_detection=ENFORCE_DETECTION,
        )

        distance = float(result.get("distance", 1.0))
        threshold = float(result.get("threshold", 0.0) or 0.0)
        if threshold > 0:
            confidence = max(0.0, min(1.0, 1 - (distance / threshold)))
        else:
            confidence = max(0.0, min(1.0, 1 - distance))
        return float(confidence)

    except Exception as e:
        logger.error(f"Face comparison failed: {str(e)}")
        return 0.0
