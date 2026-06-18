"""
InsightFace (buffalo_l) asosidagi yuz aniqlash va tahlil servisi.

Optimallashtirishlar:
  - Ikkita model: aniq (320x320) + tez (320x320)
  - Auto-resize: katta rasmlar (>1280px) kichraytiriladi
  - EXIF orientation: mobil fotolar to'g'ri burila
  - Thread lock: parallel so'rovlarda xavfsiz
  - Yuz sifat filtri: past det_score rad etiladi
"""
import logging
import os
import threading
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_MODEL_ROOT = os.getenv("INSIGHTFACE_MODEL_ROOT", None)
_MAX_IMAGE_DIM = int(os.getenv("MAX_IMAGE_DIM", "1280"))     # px — katta rasm resize
_MIN_DET_SCORE = float(os.getenv("MIN_DET_SCORE", "0.45"))  # yuz sifat chegarasi

# Thread lock — model bir vaqtda faqat bitta thread orqali ishlaydi
_lock = threading.Lock()


class FaceService:
    # 320x320 � aniqlik talab qiladigan operatsiyalar uchun (analyze, match, quality)
    _app_accurate = None
    # 320x320 — real-time tez operatsiyalar uchun (presence, blink, liveness)
    _app_fast = None

    @classmethod
    def _get_accurate(cls):
        if cls._app_accurate is None:
            with _lock:
                if cls._app_accurate is None:  # double-checked locking
                    try:
                        from insightface.app import FaceAnalysis
                        kwargs = {"root": _MODEL_ROOT} if _MODEL_ROOT else {}
                        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"], **kwargs)
                        app.prepare(ctx_id=0, det_size=(320, 320))
                        cls._app_accurate = app
                        logger.info("InsightFace accurate (320x320) tayyor.")
                    except Exception as exc:
                        logger.exception("InsightFace accurate yuklanmadi: %s", exc)
                        raise RuntimeError(f"InsightFace yuklanmadi: {exc}") from exc
        return cls._app_accurate

    @classmethod
    def _get_fast(cls):
        if cls._app_fast is None:
            with _lock:
                if cls._app_fast is None:
                    try:
                        from insightface.app import FaceAnalysis
                        kwargs = {"root": _MODEL_ROOT} if _MODEL_ROOT else {}
                        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"], **kwargs)
                        app.prepare(ctx_id=0, det_size=(320, 320))
                        cls._app_fast = app
                        logger.info("InsightFace fast (320x320) tayyor.")
                    except Exception as exc:
                        logger.exception("InsightFace fast yuklanmadi: %s", exc)
                        raise RuntimeError(f"InsightFace yuklanmadi: {exc}") from exc
        return cls._app_fast

    # Eski get_app — backward compatibility uchun
    @classmethod
    def _get_app(cls):
        return cls._get_accurate()

    @classmethod
    def analyze(cls, image_bytes: bytes) -> dict:
        """
        Rasmdan barcha yuzlarni aniqlab, ArcFace 512-dim embedding qaytaradi.
        320x320 aniq model ishlatiladi.
        Returns: {"face_count": int, "faces": [{"bbox", "det_score", "embedding"}, ...]}
        """
        img = _preprocess_image(image_bytes)
        if img is None:
            return {"face_count": 0, "faces": [], "error": "invalid_image"}

        try:
            with _lock:
                faces = cls._get_accurate().get(img)
        except Exception as exc:
            logger.exception("analyze xatosi: %s", exc)
            return {"face_count": 0, "faces": [], "error": str(exc)}

        result_faces = []
        for face in faces:
            if float(face.det_score) < _MIN_DET_SCORE:
                continue
            embedding = face.embedding.tolist() if face.embedding is not None else None
            result_faces.append({
                "bbox": [round(v, 1) for v in face.bbox.tolist()],
                "det_score": round(float(face.det_score), 4),
                "embedding": embedding,
            })

        return {"face_count": len(result_faces), "faces": result_faces}

    @classmethod
    def match(cls, img1_bytes: bytes, img2_bytes: bytes, threshold: float = 0.55) -> dict:
        """
        Pasport rasmi va selfie ni ArcFace embedding + cosine similarity orqali solishtiradi.
        Ikkala rasm ham 320x320 aniq model bilan qayta ishlanadi.
        Eng yaxshi aniqlangan yuz (yuqori det_score) tanlanadi.
        Returns: {"verified": bool, "confidence": float [0,1]}
        """
        img1 = _preprocess_image(img1_bytes)
        img2 = _preprocess_image(img2_bytes)

        if img1 is None or img2 is None:
            return {"verified": False, "confidence": 0.0, "error": "invalid_image"}

        try:
            with _lock:
                app = cls._get_accurate()
                faces1 = app.get(img1)
                faces2 = app.get(img2)
        except Exception as exc:
            logger.exception("match xatosi: %s", exc)
            return {"verified": False, "confidence": 0.0, "error": str(exc)}

        if not faces1:
            return {"verified": False, "confidence": 0.0, "error": "no_face_in_first_image"}
        if not faces2:
            return {"verified": False, "confidence": 0.0, "error": "no_face_in_second_image"}

        # Eng yuqori det_score li yuzni ol
        best1 = max(faces1, key=lambda f: float(f.det_score))
        best2 = max(faces2, key=lambda f: float(f.det_score))

        emb1 = best1.embedding
        emb2 = best2.embedding

        if emb1 is None or emb2 is None:
            return {"verified": False, "confidence": 0.0, "error": "no_embedding"}

        # InsightFace buffalo_l embeddinglari L2-normalized — to'g'ridan-to'g'ri dot product
        confidence = _cosine_similarity(emb1, emb2)

        return {
            "verified": confidence >= threshold,
            "confidence": round(confidence, 4),
            "cosine_similarity": round(confidence, 4),
            "det_score_1": round(float(best1.det_score), 4),
            "det_score_2": round(float(best2.det_score), 4),
        }

    @classmethod
    def presence(cls, image_bytes: bytes) -> dict:
        """
        Kadrda yuz bor-yo'qligini va nechta yuz borligini aniqlaydi.
        320x320 aniq model ishlatiladi (sifat ta'minlash uchun).
        Returns: {"present": bool, "face_count": int, "multiple": bool, "confidence": float}
        """
        img = _preprocess_image(image_bytes, max_dim=640)  # Presence uchun kichikroq
        if img is None:
            return {"present": False, "face_count": 0, "multiple": False, "confidence": 0.0, "error": "invalid_image"}

        try:
            with _lock:
                faces = cls._get_accurate().get(img)
        except Exception as exc:
            logger.exception("presence xatosi: %s", exc)
            return {"present": False, "face_count": 0, "multiple": False, "confidence": 0.0, "error": str(exc)}

        # Faqat sifatli yuzlarni hisoblash
        valid_faces = [f for f in faces if float(f.det_score) >= _MIN_DET_SCORE]
        count = len(valid_faces)
        # Eng yuqori det_score ni confidence sifatida qaytaramiz
        best_confidence = float(max(valid_faces, key=lambda f: float(f.det_score)).det_score) if valid_faces else 0.0
        
        # Eng yaxshi yuzning embedding ni qaytarish (agar bor bo'lsa)
        best_embedding = None
        if valid_faces:
            best_face = max(valid_faces, key=lambda f: float(f.det_score))
            best_embedding = best_face.embedding.tolist() if hasattr(best_face, 'embedding') and best_face.embedding is not None else None
        
        return {
            "present": count > 0,
            "face_count": count,
            "multiple": count > 1,
            "confidence": round(best_confidence, 4),
            "embedding": best_embedding,
        }

    @classmethod
    def quality(cls, image_bytes: bytes) -> dict:
        """
        Ro'yxatdan o'tish uchun rasm sifatini tekshiradi.
        Tiniqlik, yorug'lik, yuz holati, yuz o'lchami tekshiriladi.
        Returns: {"is_good": bool, "score": float [0,1], "issues": [...]}
        """
        img = _preprocess_image(image_bytes)
        if img is None:
            return {"is_good": False, "score": 0.0, "issues": ["invalid_image"]}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = img.shape[:2]

        # --- Tiniqlik (Laplacian variance) ---
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        # --- Yorug'lik (CLAHE normallashtirilgan) ---
        brightness = float(np.mean(gray))

        issues = []
        score = 1.0

        if sharpness < 50.0:
            issues.append("blurry")
            score -= 0.35
        elif sharpness < 120.0:
            issues.append("slightly_blurry")
            score -= 0.1

        if brightness < 35.0:
            issues.append("too_dark")
            score -= 0.3
        elif brightness > 225.0:
            issues.append("too_bright")
            score -= 0.2
        elif 50.0 <= brightness <= 200.0:
            score += 0.05  # Optimal yorug'lik bonus

        try:
            with _lock:
                faces = cls._get_accurate().get(img)

            if not faces:
                issues.append("no_face")
                score -= 0.5
            elif len(faces) > 1:
                issues.append("multiple_faces")
                score -= 0.2
            else:
                face = faces[0]
                det_score = float(face.det_score)

                if det_score < 0.5:
                    issues.append("low_detection_confidence")
                    score -= 0.2
                elif det_score >= 0.8:
                    score += 0.05  # Yuqori sifat bonus

                # Yuz o'lchami — juda kichik yuz
                x1, y1, x2, y2 = face.bbox
                face_w = x2 - x1
                face_h = y2 - y1
                face_area_ratio = (face_w * face_h) / (w * h)
                if face_area_ratio < 0.04:
                    issues.append("face_too_small")
                    score -= 0.15
                elif face_area_ratio > 0.8:
                    issues.append("face_too_close")
                    score -= 0.1

        except Exception:
            issues.append("detection_error")
            score -= 0.3

        score = round(max(0.0, min(1.0, score)), 3)

        return {
            "is_good": score >= 0.65 and not issues,
            "score": score,
            "sharpness": round(sharpness, 1),
            "brightness": round(brightness, 1),
            "issues": issues,
        }

    @classmethod
    def liveness(cls, image_bytes: bytes) -> dict:
        """
        Single-frame anti-spoofing.
        Yuz atrofidagi tekstura, rang dispersiyasi va gradient tahlilini birlashtiradi.
        Faqat yuz ROI (region of interest) tahlil qilinadi — fon ta'sirini kamaytirish.
        Returns: {"is_live": bool, "score": float [0,1]}
        """
        img = _preprocess_image(image_bytes, max_dim=640)
        if img is None:
            return {"is_live": False, "score": 0.0, "confidence": 0.0, "error": "invalid_image"}

        # Yuzni topib, faqat yuz ROI ni tahlil qilamiz
        face_roi = img
        det_score = 0.0
        try:
            with _lock:
                faces = cls._get_accurate().get(img)
            if faces:
                best = max(faces, key=lambda f: float(f.det_score))
                det_score = float(best.det_score)
                if det_score >= _MIN_DET_SCORE:
                    x1, y1, x2, y2 = [int(v) for v in best.bbox]
                    # Yuz atrofida 20% padding qo'shish
                    pad_x = int((x2 - x1) * 0.2)
                    pad_y = int((y2 - y1) * 0.2)
                    h, w = img.shape[:2]
                    x1 = max(0, x1 - pad_x)
                    y1 = max(0, y1 - pad_y)
                    x2 = min(w, x2 + pad_x)
                    y2 = min(h, y2 + pad_y)
                    if x2 > x1 and y2 > y1:
                        face_roi = img[y1:y2, x1:x2]
        except Exception:
            pass

        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
        ycrcb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YCrCb)

        # 1. Laplacian sharpness (haqiqiy yuz: 40-800)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        # 2. Rang saturation dispersiyasi (haqiqiy teri: > 18)
        sat_std = float(np.std(hsv[:, :, 1]))

        # 3. YCrCb skin color ratio — haqiqiy teri rangi
        cr = ycrcb[:, :, 1].astype(np.float32)
        cb = ycrcb[:, :, 2].astype(np.float32)
        skin_mask = (
            (cr >= 133) & (cr <= 173) &
            (cb >= 77) & (cb <= 127)
        )
        skin_ratio = float(np.sum(skin_mask)) / max(skin_mask.size, 1)

        # 4. Lokal tekstura gradient (Sobel)
        sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        texture = float(np.mean(np.sqrt(sx ** 2 + sy ** 2)))

        # 5. Intensivlik dispersiyasi
        intensity_std = float(np.std(gray))

        score = 0.3  # Boshlang'ich qiymat

        # Sharpness: juda aniq = bosma/ekran, optimal = haqiqiy
        if 40.0 < sharpness < 800.0:
            score += 0.15
        elif sharpness >= 800.0:
            score -= 0.10

        # Rang dispersiyasi
        if sat_std > 22.0:
            score += 0.20
        elif sat_std > 14.0:
            score += 0.10

        # Teri rangi
        if skin_ratio > 0.25:
            score += 0.20
        elif skin_ratio > 0.12:
            score += 0.10

        # Tekstura
        if texture > 14.0:
            score += 0.10
        elif texture > 8.0:
            score += 0.05

        # Intensivlik dispersiyasi
        if intensity_std > 28.0:
            score += 0.05

        # Yuz aniqlash sifati bonus
        if det_score >= 0.7:
            score += 0.05
        elif det_score < _MIN_DET_SCORE:
            score -= 0.10

        score = round(max(0.0, min(1.0, score)), 3)

        return {
            "is_live": score >= 0.55,
            "score": score,
            "confidence": score,
        }

    @classmethod
    def blink(cls, image_bytes: bytes) -> dict:
        """
        Ko'z qisishni EAR (Eye Aspect Ratio) orqali aniqlaydi.
        InsightFace 2D-106 landmark yoki 5-nuqta KPS ishlatiladi.
        Returns: {"blink_detected": bool, "left_ear": float, "right_ear": float}
        """
        img = _preprocess_image(image_bytes, max_dim=640)
        if img is None:
            return {"blink_detected": False, "error": "invalid_image"}

        try:
            with _lock:
                faces = cls._get_accurate().get(img)
        except Exception as exc:
            logger.exception("blink xatosi: %s", exc)
            return {"blink_detected": False, "error": str(exc)}

        if not faces:
            return {"blink_detected": False, "error": "no_face"}

        # Eng yaqin (eng katta) yuzni ol
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        lm = getattr(face, "landmark_2d_106", None)

        if lm is not None and len(lm) >= 106:
            # InsightFace 2D-106 landmark nuqtalari
            left_ear = _ear_from_landmarks(lm, 33, 35, 40, 39, 34, 42)
            right_ear = _ear_from_landmarks(lm, 87, 89, 94, 93, 88, 96)
        elif face.kps is not None and len(face.kps) >= 5:
            # 5-nuqta KPS: 0=right_eye, 1=left_eye, 2=nose, 3=right_mouth, 4=left_mouth
            # KPS orqali EAR hisob qilib bo'lmaydi — har bir ko'z uchun bitta nuqta bor
            # Liveness ga asoslanib taxminiy javob qaytaramiz
            left_ear, right_ear = 0.28, 0.28  # Uncertain
        else:
            return {"blink_detected": False, "error": "no_landmarks"}

        EAR_THRESHOLD = 0.21
        blink_detected = (left_ear < EAR_THRESHOLD) or (right_ear < EAR_THRESHOLD)

        return {
            "blink_detected": blink_detected,
            "left_ear": round(left_ear, 4),
            "right_ear": round(right_ear, 4),
        }


def _preprocess_image(image_bytes: bytes, max_dim: int = _MAX_IMAGE_DIM) -> Optional[np.ndarray]:
    """
    Baytlardan OpenCV BGR rasmini qaytaradi.
    - EXIF orientation tuzatish (mobil fotolar uchun)
    - Katta rasmlarni resize (tezlik uchun)
    - CLAHE kontrast normallash (qorong'i/yorqin rasmlar uchun)
    """
    if not image_bytes:
        return None
    try:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        # EXIF orientation tuzatish (JPEG fayllar uchun)
        img = _fix_exif_orientation(image_bytes, img)

        # Katta rasm auto-resize (aspect ratio saqlanadi)
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # CLAHE kontrast normallash (juda qorong'i yoki juda yorqin rasmlar uchun)
        gray_mean = float(np.mean(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)))
        if gray_mean < 40.0 or gray_mean > 215.0:
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            img = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

        return img
    except Exception:
        return None


def _fix_exif_orientation(image_bytes: bytes, img: np.ndarray) -> np.ndarray:
    """JPEG EXIF ma'lumotlaridan orientatsiyani o'qib, rasmni to'g'rilaydi."""
    try:
        # JPEG EXIF markeri: FFD8 + FF E1
        if len(image_bytes) < 4 or image_bytes[:2] != b'\xff\xd8':
            return img  # JPEG emas

        orientation = _read_exif_orientation(image_bytes)
        if orientation == 3:
            img = cv2.rotate(img, cv2.ROTATE_180)
        elif orientation == 6:
            img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        elif orientation == 8:
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    except Exception:
        pass
    return img


def _read_exif_orientation(data: bytes) -> int:
    """JPEG baytlaridan EXIF orientation tag ni o'qiydi."""
    try:
        i = 2
        while i < len(data) - 1:
            if data[i] != 0xFF:
                break
            marker = data[i + 1]
            if marker == 0xE1:  # APP1 (EXIF)
                length = int.from_bytes(data[i + 2:i + 4], 'big')
                app1 = data[i + 4:i + 2 + length]
                if app1[:4] == b'Exif':
                    tiff_start = 6
                    endian = app1[tiff_start:tiff_start + 2]
                    bo = 'little' if endian == b'II' else 'big'
                    ifd_offset = int.from_bytes(app1[tiff_start + 4:tiff_start + 8], bo)
                    ifd_pos = tiff_start + ifd_offset
                    num_entries = int.from_bytes(app1[ifd_pos:ifd_pos + 2], bo)
                    for e in range(num_entries):
                        entry_pos = ifd_pos + 2 + e * 12
                        tag = int.from_bytes(app1[entry_pos:entry_pos + 2], bo)
                        if tag == 0x0112:  # Orientation tag
                            return int.from_bytes(app1[entry_pos + 8:entry_pos + 10], bo)
                return 1
            i += 2 + int.from_bytes(data[i + 2:i + 4], 'big')
    except Exception:
        pass
    return 1


def _cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """
    L2-normalized embeddinglari uchun cosine similarity.
    InsightFace buffalo_l modeli L2-normalized embedding qaytaradi (norm=1).
    Shuning uchun to'g'ridan-to'g'ri dot product ni ishlatamiz.
    """
    try:
        a = np.array(emb1, dtype=np.float32)
        b = np.array(emb2, dtype=np.float32)
        
        # L2-normalized embeddinglari uchun dot product [-1, 1] oraliqda
        # Agar normalizatsiya bo'lmasa, norms bilan bo'lamiz
        n_a = np.linalg.norm(a)
        n_b = np.linalg.norm(b)
        
        # Norms 1 ga juda yaqin bo'lishini tekshir (L2-normalized)
        if abs(n_a - 1.0) < 0.01 and abs(n_b - 1.0) < 0.01:
            # L2-normalized — to'g'ridan-to'g'ri dot product
            cosine_sim = float(np.dot(a, b))
        else:
            # Normalizatsiya qilinmagan — normalize qilib bo'l
            if n_a < 1e-5 or n_b < 1e-5:
                return 0.0
            cosine_sim = float(np.dot(a, b) / (n_a * n_b))
        
        # [-1, 1] dan [0, 1] ga o'tkazish (similarity → confidence)
        confidence = float((cosine_sim + 1.0) / 2.0)
        return float(max(0.0, min(1.0, confidence)))
    except Exception:
        return 0.0


def _ear_from_landmarks(lm: np.ndarray, p1: int, p2: int, p3: int, p4: int, p5: int, p6: int) -> float:
    try:
        def dist(a, b):
            return float(np.linalg.norm(lm[a] - lm[b]))
        vertical_1 = dist(p2, p6)
        vertical_2 = dist(p3, p5)
        horizontal = dist(p1, p4)
        if horizontal < 1e-5:
            return 0.3
        return (vertical_1 + vertical_2) / (2.0 * horizontal)
    except Exception:
        return 0.3
