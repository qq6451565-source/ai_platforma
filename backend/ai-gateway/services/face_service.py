import os

import cv2
import numpy as np
from deepface import DeepFace
from loguru import logger

MODEL_NAME = os.getenv("FACE_MODEL", "Facenet512")
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "opencv")  # retinaface, mtcnn, opencv, mediapipe, ssd, yolo, dlib, centerface


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

        result = DeepFace.verify(
            img1_path=passport_img,
            img2_path=selfie_img,
            model_name=MODEL_NAME,
            detector_backend=DETECTION_BACKEND,
            enforce_detection=False,
        )

        distance = result.get("distance", 1.0)
        confidence = max(0.0, min(1.0, 1 - distance))
        return float(confidence)

    except Exception as e:
        logger.error(f"Face comparison failed: {str(e)}")
        return 0.0
