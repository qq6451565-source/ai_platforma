import os
from typing import Dict, List, Any, Tuple, Optional

import cv2
import numpy as np
from deepface import DeepFace
from loguru import logger

MODEL_NAME = os.getenv("FACE_MODEL", "Facenet512")
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "opencv")  # retinaface, mtcnn, opencv, mediapipe, ssd, yolo, dlib, centerface
ENFORCE_DETECTION = os.getenv("FACE_ENFORCE_DETECTION", "false").lower() in ("1", "true", "yes", "on")

MIN_FACE_AREA = int(os.getenv("FACE_MIN_AREA", "2500"))
MIN_FACE_SIZE = int(os.getenv("MIN_FACE_SIZE", "80"))
MIN_BRIGHTNESS = int(os.getenv("MIN_BRIGHTNESS", "40"))
MAX_BRIGHTNESS = int(os.getenv("MAX_BRIGHTNESS", "220"))
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "50.0"))


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


def analyze_faces(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze image for face detection with comprehensive metrics.
    
    Returns:
        {
            "faces_detected": int,
            "faces": [
                {
                    "bbox": {"x": int, "y": int, "w": int, "h": int},
                    "confidence": float,
                    "embedding": List[float]  # Face embedding vector
                }
            ]
        }
    """
    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image for face analysis")
            return {"faces_detected": 0, "faces": []}
        
        # Extract all faces with DeepFace
        try:
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=DETECTION_BACKEND,
                enforce_detection=False,
                align=True,
            )
        except Exception as e:
            logger.warning(f"Face extraction failed: {e}")
            return {"faces_detected": 0, "faces": []}
        
        if not faces:
            return {"faces_detected": 0, "faces": []}
        
        result_faces = []
        for face_data in faces:
            area = face_data.get("facial_area", {})
            confidence = face_data.get("confidence", 0.0)
            
            # Get face embedding
            try:
                face_img = face_data.get("face")
                if face_img is not None:
                    embedding_result = DeepFace.represent(
                        img_path=face_img,
                        model_name=MODEL_NAME,
                        detector_backend=DETECTION_BACKEND,
                        enforce_detection=False,
                    )
                    embedding = embedding_result[0]["embedding"] if embedding_result else []
                else:
                    embedding = []
            except Exception as e:
                logger.warning(f"Failed to extract embedding: {e}")
                embedding = []
            
            result_faces.append({
                "bbox": {
                    "x": int(area.get("x", 0)),
                    "y": int(area.get("y", 0)),
                    "w": int(area.get("w", 0)),
                    "h": int(area.get("h", 0)),
                },
                "confidence": round(float(confidence), 4),
                "embedding": embedding,
            })
        
        logger.info(f"Analyzed {len(result_faces)} faces")
        return {
            "faces_detected": len(result_faces),
            "faces": result_faces,
        }
    
    except Exception as e:
        logger.error(f"Face analysis failed: {str(e)}")
        return {"faces_detected": 0, "faces": []}


def check_face_quality(image_bytes: bytes) -> Dict[str, Any]:
    """
    Check face quality for registration purposes.
    
    Returns:
        {
            "is_valid": bool,
            "issues": List[str],
            "metrics": {
                "face_detected": bool,
                "face_size": int,
                "brightness": float,
                "sharpness": float,
                "multiple_faces": bool
            }
        }
    """
    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return {
                "is_valid": False,
                "issues": ["Failed to decode image"],
                "metrics": {}
            }
        
        issues = []
        metrics = {
            "face_detected": False,
            "face_size": 0,
            "brightness": 0.0,
            "sharpness": 0.0,
            "multiple_faces": False,
        }
        
        # Detect faces
        try:
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=DETECTION_BACKEND,
                enforce_detection=False,
                align=True,
            )
        except Exception as e:
            logger.warning(f"Face detection failed: {e}")
            faces = []
        
        if not faces:
            issues.append("No face detected")
            return {
                "is_valid": False,
                "issues": issues,
                "metrics": metrics
            }
        
        metrics["face_detected"] = True
        
        if len(faces) > 1:
            metrics["multiple_faces"] = True
            issues.append("Multiple faces detected")
        
        # Analyze primary face
        primary_face = max(
            faces,
            key=lambda f: f.get("facial_area", {}).get("w", 0) * f.get("facial_area", {}).get("h", 0)
        )
        
        area = primary_face.get("facial_area", {})
        face_w = area.get("w", 0)
        face_h = area.get("h", 0)
        face_size = min(face_w, face_h)
        metrics["face_size"] = face_size
        
        if face_size < MIN_FACE_SIZE:
            issues.append(f"Face too small (minimum {MIN_FACE_SIZE}px)")
        
        # Check brightness
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        x, y, w, h = area.get("x", 0), area.get("y", 0), face_w, face_h
        x, y = max(0, x), max(0, y)
        x2, y2 = min(img.shape[1], x + w), min(img.shape[0], y + h)
        
        if x2 > x and y2 > y:
            face_region = gray[y:y2, x:x2]
            brightness = float(np.mean(face_region))
            metrics["brightness"] = round(brightness, 2)
            
            if brightness < MIN_BRIGHTNESS:
                issues.append("Image too dark")
            elif brightness > MAX_BRIGHTNESS:
                issues.append("Image too bright")
        
        # Check sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = float(laplacian.var())
        metrics["sharpness"] = round(sharpness, 2)
        
        if sharpness < MIN_SHARPNESS:
            issues.append("Image too blurry")
        
        is_valid = len(issues) == 0
        logger.info(f"Face quality check: valid={is_valid}, issues={issues}")
        
        return {
            "is_valid": is_valid,
            "issues": issues,
            "metrics": metrics
        }
    
    except Exception as e:
        logger.error(f"Face quality check failed: {str(e)}")
        return {
            "is_valid": False,
            "issues": [f"Quality check error: {str(e)}"],
            "metrics": {}
        }


def compare_embeddings(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Compare two face embeddings using cosine similarity.
    
    Returns:
        Confidence score (0.0 to 1.0)
    """
    try:
        if not embedding1 or not embedding2:
            return 0.0
        
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        cosine_sim = dot_product / (norm1 * norm2)
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        confidence = (cosine_sim + 1) / 2
        
        return float(max(0.0, min(1.0, confidence)))
    
    except Exception as e:
        logger.error(f"Embedding comparison failed: {str(e)}")
        return 0.0
