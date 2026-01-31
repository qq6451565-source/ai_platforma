import asyncio
import os
import sys
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from loguru import logger
from starlette.concurrency import run_in_threadpool

from services.ocr_service import extract_passport_data
from services.face_service import compare_faces
from services.presence_service import detect_presence


load_dotenv()

# Loguru loglarini faylga va stdout ga yozish (markazlashtirilgan loglar uchun)
LOG_PATH = os.getenv("LOG_PATH", "/app/logs/ai-gateway.log")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
logger.remove()
logger.add(sys.stdout, level="INFO", enqueue=True, backtrace=True, diagnose=True)
logger.add(LOG_PATH, rotation="10 MB", retention="10 days", level="INFO", enqueue=True, backtrace=True, diagnose=True)

app = FastAPI(title="AI Gateway", version="1.0.0")

# Reduce noisy WinError 64 accept failures on Windows event loop.
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Security / thresholds
API_KEY = os.getenv("AI_API_KEY", "default-key")
FACE_MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", 0.55))
PRESENCE_THRESHOLD = float(os.getenv("PRESENCE_THRESHOLD", 0.5))
OCR_CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", 0.0))
MAX_IMAGE_SIZE_MB = float(os.getenv("MAX_IMAGE_SIZE_MB", 8))


def _check_api_key(api_key_form: Optional[str], api_key_header: Optional[str]):
    token = api_key_form or api_key_header
    if token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")


@app.post("/ocr/passport")
async def ocr_passport(
    file: UploadFile = File(...),
    api_key: str = Form(None),
    x_api_key: str = Header(None),
):
    _check_api_key(api_key, x_api_key)

    try:
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=413, detail="Image too large")

        result = await run_in_threadpool(
            extract_passport_data,
            contents,
            OCR_CONFIDENCE_THRESHOLD,
        )
        logger.info(f"OCR completed for file: {file.filename}")
        return result
    except Exception as e:
        logger.error(f"OCR failed: {str(e)}")
        raise HTTPException(status_code=500, detail="OCR processing failed")


@app.post("/face/match")
async def face_match(
    passport_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    api_key: str = Form(None),
    x_api_key: str = Header(None),
):
    _check_api_key(api_key, x_api_key)

    try:
        passport_contents = await passport_image.read()
        selfie_contents = await selfie_image.read()
        size_mb_passport = len(passport_contents) / (1024 * 1024)
        size_mb_selfie = len(selfie_contents) / (1024 * 1024)
        if size_mb_passport > MAX_IMAGE_SIZE_MB or size_mb_selfie > MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=413, detail="Image too large")

        confidence = await run_in_threadpool(compare_faces, passport_contents, selfie_contents)
        verified = confidence >= FACE_MATCH_THRESHOLD
        logger.info(f"Face match completed: verified={verified}, confidence={confidence}")
        return {"verified": verified, "confidence": round(confidence, 4)}
    except Exception as e:
        logger.error(f"Face match failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Face matching failed")


@app.post("/face/presence")
async def face_presence(
    file: UploadFile = File(...),
    api_key: str = Form(None),
    x_api_key: str = Header(None),
):
    _check_api_key(api_key, x_api_key)

    try:
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_IMAGE_SIZE_MB:
            raise HTTPException(status_code=413, detail="Image too large")

        present, confidence = await run_in_threadpool(detect_presence, contents)
        if confidence < PRESENCE_THRESHOLD:
            present = False
        logger.info(f"Presence detection completed: present={present}, confidence={confidence}")
        return {"present": present, "confidence": round(confidence, 4)}
    except Exception as e:
        logger.error(f"Presence detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Presence detection failed")


@app.get("/")
def health_check():
    return {
        "status": "AI Gateway is running",
        "version": "1.0.0",
        "face_match_threshold": FACE_MATCH_THRESHOLD,
        "presence_threshold": PRESENCE_THRESHOLD,
        "ocr_confidence_threshold": OCR_CONFIDENCE_THRESHOLD,
        "max_image_size_mb": MAX_IMAGE_SIZE_MB,
    }


@app.get("/health")
def health_check_simple():
    return {"status": "ok"}

