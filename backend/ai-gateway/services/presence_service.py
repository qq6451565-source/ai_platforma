import cv2
import numpy as np
from loguru import logger

# OpenCV haarcascade modelini yuklab olamiz (oldindan tayyor)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def detect_presence(image_bytes):
    """
    Rasm ichida yuz borligini aniqlaydi.
    Chiqish: (present: bool, confidence: float)
    """
    try:
        # Rasmni numpy arrayga o'tkazish
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return False, 0.0

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(faces) > 0:
            max_area = max([(w * h) for (x, y, w, h) in faces]) if len(faces) > 0 else 0
            max_possible_area = max(1, img.shape[0] * img.shape[1])
            confidence = min(1.0, max_area / max_possible_area * 2)
            return True, float(round(confidence, 4))
        else:
            return False, 0.0

    except Exception as e:
        logger.error(f"Presence detection failed: {str(e)}")
        return False, 0.0
