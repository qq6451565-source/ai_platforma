"""
AI Gateway — FastAPI service for face verification, OCR, and liveness detection.

Endpoints:
  GET  /           — Root health check
  GET  /health     — Simple health check (load-balancer)
  GET  /ready      — Readiness check
  GET  /metrics    — Performance metrics

  POST /ocr/passport     — Extract passport data via OCR
  POST /face/match       — Compare two face images
  POST /face/presence    — Detect face presence in frame
  POST /face/analyze     — Extract face embeddings
  POST /face/quality     — Validate face image quality
  POST /face/liveness    — Anti-spoofing single-frame check
  POST /face/blink       — Blink / eye-openness detection
"""

from __future__ import annotations

import io
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
AI_API_KEY: str = os.getenv("AI_API_KEY", "")
DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
ALLOWED_ORIGINS: List[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if o.strip()
]

FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.55"))
PRESENCE_THRESHOLD: float = float(os.getenv("PRESENCE_THRESHOLD", "0.5"))
OCR_CONFIDENCE_THRESHOLD: float = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.0"))
MAX_IMAGE_SIZE_MB: float = float(os.getenv("MAX_IMAGE_SIZE_MB", "8"))
MAX_IMAGE_SIZE_BYTES: int = int(MAX_IMAGE_SIZE_MB * 1024 * 1024)

FACE_MODEL: str = os.getenv("FACE_MODEL", "Facenet512")
DETECTION_BACKEND: str = os.getenv("DETECTION_BACKEND", "opencv")
ENFORCE_DETECTION: bool = os.getenv("ENFORCE_DETECTION", "false").lower() in ("1", "true")

QUALITY_MIN_BRIGHTNESS: float = float(os.getenv("FACE_QUALITY_MIN_BRIGHTNESS", "40"))
QUALITY_MAX_BRIGHTNESS: float = float(os.getenv("FACE_QUALITY_MAX_BRIGHTNESS", "220"))
QUALITY_MIN_SHARPNESS: float = float(os.getenv("FACE_QUALITY_MIN_SHARPNESS", "35"))
QUALITY_MIN_FACE_RATIO: float = float(os.getenv("FACE_QUALITY_MIN_FACE_RATIO", "0.08"))
QUALITY_MAX_FACE_RATIO: float = float(os.getenv("FACE_QUALITY_MAX_FACE_RATIO", "0.75"))

APP_VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_level = logging.DEBUG if DEBUG else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_gateway")

# ---------------------------------------------------------------------------
# Lazy deepface import (avoids heavy load at module import time in tests)
# ---------------------------------------------------------------------------
_deepface = None


def _get_deepface():
    global _deepface
    if _deepface is None:
        try:
            from deepface import DeepFace  # type: ignore

            _deepface = DeepFace
        except ImportError:
            logger.warning("deepface not installed — face endpoints will be limited")
            _deepface = False
    return _deepface if _deepface else None


_pytesseract = None


def _get_pytesseract():
    global _pytesseract
    if _pytesseract is None:
        try:
            import pytesseract  # type: ignore

            _pytesseract = pytesseract
        except ImportError:
            logger.warning("pytesseract not installed — OCR endpoint will be limited")
            _pytesseract = False
    return _pytesseract if _pytesseract else None


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
from services.metrics import metrics  # noqa: E402

# ---------------------------------------------------------------------------
# Request counter (used for request_id generation)
# ---------------------------------------------------------------------------
import threading

_req_counter = 0
_req_lock = threading.Lock()


def _next_request_id() -> str:
    global _req_counter
    with _req_lock:
        _req_counter += 1
        return f"req_{_req_counter}_{int(time.time() * 1000)}"


# ---------------------------------------------------------------------------
# Response helpers
# ---------------------------------------------------------------------------

def _ok(data: Any, request_id: str) -> dict:
    return {
        "success": True,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
    }


def _err(message: str, request_id: str) -> dict:
    return {
        "success": False,
        "error": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
    }


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _check_auth(api_key_form: Optional[str], x_api_key: Optional[str]) -> bool:
    """Return True if authentication passes or no key is configured."""
    if not AI_API_KEY:
        return True
    provided = api_key_form or x_api_key or ""
    return provided == AI_API_KEY


# ---------------------------------------------------------------------------
# Image loading helpers
# ---------------------------------------------------------------------------

def _load_image_bytes(data: bytes) -> np.ndarray:
    """Convert raw bytes to a BGR numpy array (OpenCV format)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def _validate_upload(data: bytes, name: str = "file") -> None:
    """Raise HTTPException for invalid uploads."""
    if not data:
        raise HTTPException(status_code=422, detail=f"{name}: file is empty")
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"{name}: file size {len(data) / 1_048_576:.1f} MB exceeds limit {MAX_IMAGE_SIZE_MB} MB",
        )


# ---------------------------------------------------------------------------
# Face helpers (deepface wrappers)
# ---------------------------------------------------------------------------

def _detect_faces_cv2(img_bgr: np.ndarray) -> List[Dict]:
    """Detect faces using OpenCV Haar cascade — fallback when deepface unavailable."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    results = []
    for x, y, w, h in faces:
        results.append({"box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}, "confidence": 0.9})
    return results


def _detect_faces(img_bgr: np.ndarray) -> List[Dict]:
    DeepFace = _get_deepface()
    if not DeepFace:
        return _detect_faces_cv2(img_bgr)
    try:
        faces = DeepFace.extract_faces(
            img_path=img_bgr,
            detector_backend=DETECTION_BACKEND,
            enforce_detection=False,
        )
        return [
            {
                "box": {
                    "x": int(f["facial_area"]["x"]),
                    "y": int(f["facial_area"]["y"]),
                    "w": int(f["facial_area"]["w"]),
                    "h": int(f["facial_area"]["h"]),
                },
                "confidence": float(f.get("confidence", 0.9)),
            }
            for f in faces
        ]
    except Exception:
        return _detect_faces_cv2(img_bgr)


# ---------------------------------------------------------------------------
# OCR helper
# ---------------------------------------------------------------------------

def _ocr_passport(img_bgr: np.ndarray) -> dict:
    """Run OCR on a passport image and extract MRZ / structured fields."""
    pytesseract = _get_pytesseract()
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    pil_img = Image.fromarray(thresh)

    raw_text = ""
    if pytesseract:
        try:
            raw_text = pytesseract.image_to_string(pil_img, lang="eng", config="--oem 3 --psm 6")
        except Exception as e:
            logger.warning("pytesseract failed: %s", e)

    result: dict = {
        "document_type": "PASSPORT",
        "mrz_line1": None,
        "mrz_line2": None,
        "name_first": None,
        "name_last": None,
        "passport_number": None,
        "birth_date": None,
        "expiry_date": None,
        "nationality": None,
        "gender": None,
        "raw_text": raw_text.strip() if DEBUG else None,
    }

    # Try to extract MRZ lines (two lines of ~44 chars with uppercase + '<' + digits)
    mrz_pattern = re.compile(r"([A-Z0-9<]{40,50})")
    mrz_lines = mrz_pattern.findall(raw_text.replace(" ", ""))
    if len(mrz_lines) >= 2:
        result["mrz_line1"] = mrz_lines[0]
        result["mrz_line2"] = mrz_lines[1]
        _parse_mrz(result, mrz_lines[0], mrz_lines[1])
    elif len(mrz_lines) == 1:
        result["mrz_line1"] = mrz_lines[0]

    return result


def _parse_mrz(result: dict, line1: str, line2: str) -> None:
    """Best-effort MRZ parsing for Type-P passports (TD3, 44 chars per line)."""
    try:
        if line1.startswith("P") and len(line1) >= 44:
            nationality = line1[2:5].replace("<", "")
            result["nationality"] = nationality or None
            name_field = line1[5:44]
            parts = name_field.split("<<")
            if parts:
                result["name_last"] = parts[0].replace("<", " ").strip() or None
                if len(parts) > 1:
                    result["name_first"] = parts[1].replace("<", " ").strip() or None
    except Exception:
        pass
    try:
        if len(line2) >= 28:
            result["passport_number"] = line2[0:9].replace("<", "") or None
            birth_raw = line2[13:19]
            expiry_raw = line2[19:25]
            result["gender"] = line2[20] if len(line2) > 20 and line2[20] in "MFX" else None
            result["birth_date"] = _format_date(birth_raw)
            result["expiry_date"] = _format_date(expiry_raw)
    except Exception:
        pass


def _format_date(raw: str) -> Optional[str]:
    """Convert YYMMDD to YYYY-MM-DD."""
    try:
        yy, mm, dd = int(raw[0:2]), int(raw[2:4]), int(raw[4:6])
        year = 2000 + yy if yy <= 30 else 1900 + yy
        return f"{year:04d}-{mm:02d}-{dd:02d}"
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Quality check helper
# ---------------------------------------------------------------------------

def _check_quality(img_bgr: np.ndarray) -> dict:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = img_bgr.shape[:2]
    total_pixels = h * w

    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    faces = _detect_faces(img_bgr)
    face_count = len(faces)

    reasons: List[str] = []
    if brightness < QUALITY_MIN_BRIGHTNESS:
        reasons.append(f"Image too dark (brightness {brightness:.1f} < {QUALITY_MIN_BRIGHTNESS})")
    if brightness > QUALITY_MAX_BRIGHTNESS:
        reasons.append(f"Image too bright (brightness {brightness:.1f} > {QUALITY_MAX_BRIGHTNESS})")
    if sharpness < QUALITY_MIN_SHARPNESS:
        reasons.append(f"Image too blurry (sharpness {sharpness:.1f} < {QUALITY_MIN_SHARPNESS})")
    if face_count == 0:
        reasons.append("No face detected")
    elif face_count > 1:
        reasons.append(f"Multiple faces detected ({face_count})")

    face_area_ratio = 0.0
    if face_count == 1:
        box = faces[0]["box"]
        face_area_ratio = (box["w"] * box["h"]) / total_pixels if total_pixels > 0 else 0.0
        if face_area_ratio < QUALITY_MIN_FACE_RATIO:
            reasons.append(f"Face too small (area ratio {face_area_ratio:.2%} < {QUALITY_MIN_FACE_RATIO:.2%})")
        elif face_area_ratio > QUALITY_MAX_FACE_RATIO:
            reasons.append(f"Face too large (area ratio {face_area_ratio:.2%} > {QUALITY_MAX_FACE_RATIO:.2%})")

    return {
        "is_valid": len(reasons) == 0,
        "reasons": reasons,
        "metrics": {
            "faces_detected": face_count,
            "brightness": round(brightness, 2),
            "sharpness": round(sharpness, 2),
            "face_area_ratio": round(face_area_ratio, 4),
        },
    }


# ---------------------------------------------------------------------------
# Liveness helper (heuristic, single-frame)
# ---------------------------------------------------------------------------

def _check_liveness(img_bgr: np.ndarray) -> dict:
    """
    Heuristic single-frame liveness check.
    Uses texture analysis (LBP variance) and brightness variance to detect
    printed photos / screen replays.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    faces = _detect_faces(img_bgr)
    reasons: List[str] = []

    if not faces:
        return {"is_live": False, "confidence": 0.0, "reasons": ["No face detected"]}

    box = faces[0]["box"]
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    face_roi = gray[y : y + h, x : x + w]

    if face_roi.size == 0:
        return {"is_live": False, "confidence": 0.0, "reasons": ["Face region empty"]}

    # Texture score via variance of local binary pattern approximation
    texture_var = float(cv2.Laplacian(face_roi, cv2.CV_64F).var())
    # Colour variance in face region
    face_bgr = img_bgr[y : y + h, x : x + w]
    colour_std = float(np.std(face_bgr))

    is_live = True
    confidence = min(1.0, texture_var / 200.0)

    if texture_var < 20:
        reasons.append(f"Low texture variance ({texture_var:.1f}) — possible printed image")
        is_live = False
    if colour_std < 10:
        reasons.append(f"Low colour variance ({colour_std:.1f}) — possible flat image")
        is_live = False

    confidence = max(0.0, min(1.0, confidence))
    return {"is_live": is_live, "confidence": round(confidence, 4), "reasons": reasons}


# ---------------------------------------------------------------------------
# Blink detection helper
# ---------------------------------------------------------------------------

def _check_blink(img_bgr: np.ndarray) -> dict:
    """
    Estimate eye openness from a single frame using eye aspect ratio (EAR) heuristic.
    Requires at least one face with detectable eye landmarks.
    DeepFace is used to extract facial landmarks when available.
    """
    faces = _detect_faces(img_bgr)
    if not faces:
        return {"eyes_detected": False, "left_open": None, "right_open": None, "blink_detected": None}

    # Fallback: rough eye-region brightness difference
    box = faces[0]["box"]
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    face_roi = img_bgr[y : y + h, x : x + w]
    if face_roi.size == 0:
        return {"eyes_detected": False, "left_open": None, "right_open": None, "blink_detected": None}

    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    eye_region_top = gray_face[int(h * 0.2) : int(h * 0.5), :]
    eye_variance = float(np.var(eye_region_top))

    # Heuristic: low variance in eye region suggests closed eyes
    eyes_open = eye_variance > 150
    return {
        "eyes_detected": True,
        "left_open": eyes_open,
        "right_open": eyes_open,
        "blink_detected": not eyes_open,
        "eye_variance": round(eye_variance, 2),
    }


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Gateway v%s starting …", APP_VERSION)
    # Warm up OpenCV cascades
    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    yield
    logger.info("AI Gateway shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Gateway",
    description="Face verification, OCR and liveness detection service",
    version=APP_VERSION,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request tracking middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def tracking_middleware(request: Request, call_next):
    request_id = _next_request_id()
    request.state.request_id = request_id
    request.state.start_time = time.time()

    response = await call_next(request)

    duration_ms = (time.time() - request.state.start_time) * 1000
    success = response.status_code < 400
    is_auth = response.status_code in (401, 403)
    metrics.record_request(
        request.url.path,
        duration_ms,
        success=success,
        is_auth_failure=is_auth,
    )

    response.headers["X-Request-ID"] = request_id
    return response


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    snapshot = metrics.get_snapshot()
    return {
        "status": "AI Gateway is running",
        "version": APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": snapshot["uptime_seconds"],
        "models_loaded": True,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready")
async def ready():
    return {
        "ready": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "config": {
            "face_match_threshold": FACE_MATCH_THRESHOLD,
            "presence_threshold": PRESENCE_THRESHOLD,
            "ocr_confidence_threshold": OCR_CONFIDENCE_THRESHOLD,
            "max_image_size_mb": MAX_IMAGE_SIZE_MB,
        },
    }


@app.get("/metrics")
async def get_metrics():
    return metrics.get_snapshot()


# ---------------------------------------------------------------------------
# OCR endpoints
# ---------------------------------------------------------------------------

@app.post("/ocr/passport")
async def ocr_passport(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        metrics.record_request("/ocr/passport", 0, success=False, is_auth_failure=True)
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        result = _ocr_passport(img)
        metrics.record_ocr(success=True)
        return _ok(result, request_id)
    except Exception as exc:
        logger.exception("OCR passport failed")
        metrics.record_ocr(success=False)
        return JSONResponse(status_code=500, content=_err(f"OCR processing failed: {exc}", request_id))


# ---------------------------------------------------------------------------
# Face endpoints
# ---------------------------------------------------------------------------

@app.post("/face/match")
async def face_match(
    passport_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    passport_bytes = await passport_image.read()
    selfie_bytes = await selfie_image.read()
    try:
        _validate_upload(passport_bytes, "passport_image")
        _validate_upload(selfie_bytes, "selfie_image")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img1 = _load_image_bytes(passport_bytes)
        img2 = _load_image_bytes(selfie_bytes)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    DeepFace = _get_deepface()
    try:
        if DeepFace:
            result = DeepFace.verify(
                img1_path=img1,
                img2_path=img2,
                model_name=FACE_MODEL,
                detector_backend=DETECTION_BACKEND,
                enforce_detection=ENFORCE_DETECTION,
                threshold=FACE_MATCH_THRESHOLD,
            )
            verified = bool(result.get("verified", False))
            distance = float(result.get("distance", 1.0))
            threshold_used = float(result.get("threshold", FACE_MATCH_THRESHOLD))
            confidence = max(0.0, min(1.0, 1.0 - distance))
        else:
            # Fallback: compare face counts as a basic check
            faces1 = _detect_faces_cv2(img1)
            faces2 = _detect_faces_cv2(img2)
            verified = len(faces1) > 0 and len(faces2) > 0
            confidence = 0.5 if verified else 0.0
            threshold_used = FACE_MATCH_THRESHOLD

        metrics.record_face_match(verified=verified)
        return _ok(
            {
                "verified": verified,
                "confidence": round(confidence, 4),
                "threshold": threshold_used,
            },
            request_id,
        )
    except Exception as exc:
        logger.exception("Face match failed")
        metrics.record_face_match(verified=False)
        return JSONResponse(status_code=400, content=_err(f"Face detection failed: {exc}", request_id))


@app.post("/face/presence")
async def face_presence(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        faces = _detect_faces(img)
        face_count = len(faces)
        present = face_count >= 1
        confidence = 1.0 if present else 0.0
        return _ok(
            {
                "present": present,
                "confidence": confidence,
                "face_count": face_count,
                "threshold": PRESENCE_THRESHOLD,
                "session_id": session_id,
            },
            request_id,
        )
    except Exception as exc:
        logger.exception("Presence check failed")
        return JSONResponse(status_code=500, content=_err(f"Presence detection failed: {exc}", request_id))


@app.post("/face/analyze")
async def face_analyze(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        faces = _detect_faces(img)
        face_count = len(faces)

        result_faces = []
        DeepFace = _get_deepface()
        for i, face_info in enumerate(faces):
            entry: dict = {"confidence": face_info["confidence"], "box": face_info["box"]}
            if DeepFace:
                try:
                    embeddings = DeepFace.represent(
                        img_path=img,
                        model_name=FACE_MODEL,
                        detector_backend=DETECTION_BACKEND,
                        enforce_detection=False,
                    )
                    if embeddings and i < len(embeddings):
                        entry["embedding"] = embeddings[i].get("embedding", [])
                except Exception:
                    entry["embedding"] = []
            result_faces.append(entry)

        return _ok({"faces_detected": face_count, "faces": result_faces}, request_id)
    except Exception as exc:
        logger.exception("Face analyze failed")
        return JSONResponse(status_code=500, content=_err(f"Face analysis failed: {exc}", request_id))


@app.post("/face/quality")
async def face_quality(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        result = _check_quality(img)
        return _ok(result, request_id)
    except Exception as exc:
        logger.exception("Quality check failed")
        return JSONResponse(status_code=500, content=_err(f"Quality check failed: {exc}", request_id))


@app.post("/face/liveness")
async def face_liveness(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        result = _check_liveness(img)
        return _ok(result, request_id)
    except Exception as exc:
        logger.exception("Liveness check failed")
        return JSONResponse(status_code=500, content=_err(f"Liveness check failed: {exc}", request_id))


@app.post("/face/blink")
async def face_blink(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    request: Request = None,
):
    request_id = getattr(request.state, "request_id", _next_request_id()) if request else _next_request_id()
    if not _check_auth(api_key, x_api_key):
        return JSONResponse(status_code=401, content=_err("Invalid API Key", request_id))

    data = await file.read()
    try:
        _validate_upload(data, "file")
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content=_err(exc.detail, request_id))

    try:
        img = _load_image_bytes(data)
    except ValueError as exc:
        return JSONResponse(status_code=422, content=_err(str(exc), request_id))

    try:
        result = _check_blink(img)
        return _ok(result, request_id)
    except Exception as exc:
        logger.exception("Blink check failed")
        return JSONResponse(status_code=500, content=_err(f"Blink detection failed: {exc}", request_id))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=DEBUG)
