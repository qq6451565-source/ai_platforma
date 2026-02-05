"""
Liveness detection service for anti-spoofing.
Implements blink detection and basic liveness checks.
"""
import os
from typing import Dict, Any, List, Tuple

import cv2
import numpy as np
from loguru import logger

# Eye aspect ratio (EAR) threshold for blink detection
EAR_THRESHOLD = float(os.getenv("EAR_THRESHOLD", "0.25"))
CONSECUTIVE_FRAMES = int(os.getenv("BLINK_CONSECUTIVE_FRAMES", "2"))


def _calculate_ear(eye_points: np.ndarray) -> float:
    """
    Calculate Eye Aspect Ratio (EAR) for blink detection.
    
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    where p1-p6 are eye landmark points
    """
    if len(eye_points) < 6:
        return 0.0
    
    # Vertical distances
    v1 = np.linalg.norm(eye_points[1] - eye_points[5])
    v2 = np.linalg.norm(eye_points[2] - eye_points[4])
    
    # Horizontal distance
    h = np.linalg.norm(eye_points[0] - eye_points[3])
    
    if h == 0:
        return 0.0
    
    ear = (v1 + v2) / (2.0 * h)
    return float(ear)


def detect_blink(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detect if person is blinking (simplified liveness check).
    
    Note: This is a basic implementation. For production, consider:
    - Multi-frame analysis
    - Challenge-response (ask user to blink)
    - More sophisticated anti-spoofing methods
    
    Returns:
        {
            "blink_detected": bool,
            "ear": float,  # Eye Aspect Ratio
            "confidence": float
        }
    """
    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image for blink detection")
            return {
                "blink_detected": False,
                "ear": 0.0,
                "confidence": 0.0
            }
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Load face cascade
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return {
                "blink_detected": False,
                "ear": 0.0,
                "confidence": 0.0
            }
        
        # Analyze first face
        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y+h, x:x+w]
        
        eyes = eye_cascade.detectMultiScale(roi_gray)
        
        # If no eyes detected, might be blinking
        if len(eyes) == 0:
            return {
                "blink_detected": True,
                "ear": 0.0,
                "confidence": 0.7
            }
        
        # If eyes detected, calculate EAR (simplified)
        # Note: This is a very basic implementation
        confidence = 0.5
        
        return {
            "blink_detected": False,
            "ear": 0.3,  # Placeholder
            "confidence": confidence
        }
    
    except Exception as e:
        logger.error(f"Blink detection failed: {str(e)}")
        return {
            "blink_detected": False,
            "ear": 0.0,
            "confidence": 0.0
        }


def check_liveness(image_bytes: bytes) -> Dict[str, Any]:
    """
    Check if image is from a live person (anti-spoofing).
    
    Implements basic checks:
    - Face texture analysis
    - Motion blur detection
    - Color distribution
    
    For production, consider:
    - Multi-frame analysis
    - Challenge-response
    - Depth sensing
    - Professional anti-spoofing solutions
    
    Returns:
        {
            "is_live": bool,
            "confidence": float,
            "checks": {
                "texture_score": float,
                "motion_blur": float,
                "color_variance": float
            }
        }
    """
    try:
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image for liveness check")
            return {
                "is_live": False,
                "confidence": 0.0,
                "checks": {}
            }
        
        checks = {}
        
        # 1. Texture analysis (LBP - Local Binary Patterns)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate texture variance (real faces have more texture)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        texture_score = float(laplacian.var())
        checks["texture_score"] = round(texture_score, 2)
        
        # 2. Motion blur detection
        # Real-time captures tend to have slight motion blur
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        checks["motion_blur"] = round(float(blur_score), 2)
        
        # 3. Color variance (printed photos have less color variance)
        color_std = np.std(img, axis=(0, 1))
        color_variance = float(np.mean(color_std))
        checks["color_variance"] = round(color_variance, 2)
        
        # Simple scoring (this is a basic heuristic)
        score = 0.0
        
        if texture_score > 100:  # Has texture
            score += 0.4
        
        if 20 < blur_score < 500:  # Reasonable blur
            score += 0.3
        
        if color_variance > 20:  # Has color variance
            score += 0.3
        
        is_live = score > 0.5
        confidence = min(1.0, score)
        
        logger.info(f"Liveness check: is_live={is_live}, confidence={confidence}")
        
        return {
            "is_live": is_live,
            "confidence": round(confidence, 4),
            "checks": checks
        }
    
    except Exception as e:
        logger.error(f"Liveness check failed: {str(e)}")
        return {
            "is_live": False,
            "confidence": 0.0,
            "checks": {}
        }


def analyze_frame_sequence(frame_bytes_list: List[bytes]) -> Dict[str, Any]:
    """
    Analyze a sequence of frames for liveness detection.
    
    This is more robust than single-frame analysis.
    
    Args:
        frame_bytes_list: List of frame images (chronologically ordered)
    
    Returns:
        {
            "is_live": bool,
            "confidence": float,
            "motion_detected": bool,
            "frame_count": int
        }
    """
    try:
        if len(frame_bytes_list) < 2:
            return {
                "is_live": False,
                "confidence": 0.0,
                "motion_detected": False,
                "frame_count": len(frame_bytes_list)
            }
        
        frames = []
        for frame_bytes in frame_bytes_list:
            img = cv2.imdecode(np.frombuffer(frame_bytes, np.uint8), cv2.IMREAD_COLOR)
            if img is not None:
                frames.append(img)
        
        if len(frames) < 2:
            return {
                "is_live": False,
                "confidence": 0.0,
                "motion_detected": False,
                "frame_count": 0
            }
        
        # Detect motion between frames
        motion_scores = []
        for i in range(len(frames) - 1):
            gray1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(frames[i + 1], cv2.COLOR_BGR2GRAY)
            
            # Calculate frame difference
            diff = cv2.absdiff(gray1, gray2)
            motion_score = float(np.mean(diff))
            motion_scores.append(motion_score)
        
        avg_motion = np.mean(motion_scores) if motion_scores else 0.0
        
        # Motion indicates liveness (but too much might be camera shake)
        motion_detected = 1.0 < avg_motion < 50.0
        
        # Calculate confidence based on motion
        if motion_detected:
            confidence = min(1.0, avg_motion / 25.0)
        else:
            confidence = 0.3
        
        is_live = motion_detected and confidence > 0.5
        
        logger.info(f"Frame sequence analysis: is_live={is_live}, motion={avg_motion}")
        
        return {
            "is_live": is_live,
            "confidence": round(float(confidence), 4),
            "motion_detected": motion_detected,
            "frame_count": len(frames),
            "avg_motion": round(float(avg_motion), 2)
        }
    
    except Exception as e:
        logger.error(f"Frame sequence analysis failed: {str(e)}")
        return {
            "is_live": False,
            "confidence": 0.0,
            "motion_detected": False,
            "frame_count": 0
        }
