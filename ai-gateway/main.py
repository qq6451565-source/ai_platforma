"""
AI Gateway — InsightFace (buffalo_l) asosidagi yuz tahlil servisi.
Javob formati: {"success": bool, "data": {...}}
"""
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from face_service import FaceService

API_KEY: Optional[str] = os.getenv("AI_API_KEY", None)
MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024
FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.55"))
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

_start_time = time.time()
_stats: dict = {
    "requests_total": 0,
    "requests_failed": 0,
    "face_verifications": 0,
    "face_matches_verified": 0,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Gateway ishga tushmoqda, InsightFace yuklanmoqda...")
    errors = []
    try:
        FaceService._get_accurate()
        logger.info("InsightFace accurate (320x320) tayyor.")
    except Exception as exc:
        errors.append(f"accurate: {exc}")
        logger.error("InsightFace accurate xatosi: %s", exc)
    try:
        FaceService._get_fast()
        logger.info("InsightFace fast (320x320) tayyor.")
    except Exception as exc:
        errors.append(f"fast: {exc}")
        logger.error("InsightFace fast xatosi: %s", exc)
    if errors:
        logger.warning("Modellar yuklashda xatolar: %s. So'rovda qayta urinadi.", errors)
    else:
        logger.info("Barcha modellar tayyor. AI Gateway ishga tushdi.")
    yield
    logger.info("AI Gateway to'xtatilmoqda.")


app = FastAPI(
    title="AI Gateway",
    description="InsightFace (buffalo_l) asosidagi yuz tahlil servisi",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

_cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",")] if _cors_origins_raw != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_tracking(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    request.state.request_id = req_id
    _stats["requests_total"] += 1
    t0 = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - t0) * 1000, 1)
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Response-Time-Ms"] = str(elapsed)
    if response.status_code >= 400:
        _stats["requests_failed"] += 1
    return response


def _verify_api_key(request: Request):
    if not API_KEY:
        return
    key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    if not key or key != API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Yaroqsiz API kaliti")


def _ok(data: dict) -> dict:
    return {"success": True, "data": data}


def _validate_file_size(file_bytes: bytes, label: str = "file"):
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"{label} hajmi chegaradan oshdi ({MAX_FILE_SIZE // (1024*1024)} MB)",
        )


@app.get("/health", tags=["health"])
async def health():
    return _ok({"status": "ok"})


@app.get("/ready", tags=["health"])
async def ready():
    accurate_ready = FaceService._app_accurate is not None
    fast_ready = FaceService._app_fast is not None
    if not accurate_ready:
        return JSONResponse(
            status_code=503,
            content={"success": False, "data": {"status": "loading", "ready": False,
                                                 "accurate_ready": accurate_ready, "fast_ready": fast_ready}},
        )
    return _ok({"status": "ready", "ready": True, "accurate_ready": accurate_ready, "fast_ready": fast_ready})


@app.get("/", tags=["health"])
async def root():
    uptime = round(time.time() - _start_time, 1)
    return _ok({
        "status": "ok",
        "model": "InsightFace buffalo_l",
        "accurate_ready": FaceService._app_accurate is not None,
        "fast_ready": FaceService._app_fast is not None,
        "uptime_seconds": uptime,
        "stats": _stats,
        "version": "3.0.0",
    })


@app.get("/metrics", tags=["health"])
async def metrics(_: None = Depends(_verify_api_key)):
    return _ok({
        "uptime_seconds": round(time.time() - _start_time, 1),
        **_stats,
    })


@app.post("/face/analyze", tags=["face"])
async def face_analyze(file: UploadFile = File(...), _: None = Depends(_verify_api_key)):
    img_bytes = await file.read()
    _validate_file_size(img_bytes, "file")
    result = FaceService.analyze(img_bytes)
    _stats["face_verifications"] += 1
    if result.get("error") and result["face_count"] == 0:
        return JSONResponse(status_code=422, content={"success": False, "error": result["error"]})
    # Backend live/services.py "faces_detected" kutadi — alias qo'shamiz
    result["faces_detected"] = result["face_count"]
    return _ok(result)


@app.post("/face/match", tags=["face"])
async def face_match(
    passport_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    threshold: Optional[float] = Form(None),
    _: None = Depends(_verify_api_key),
):
    p_bytes = await passport_image.read()
    s_bytes = await selfie_image.read()
    _validate_file_size(p_bytes, "passport_image")
    _validate_file_size(s_bytes, "selfie_image")
    th = threshold if threshold is not None else FACE_MATCH_THRESHOLD
    result = FaceService.match(p_bytes, s_bytes, threshold=th)
    if result.get("error"):
        return JSONResponse(status_code=422, content={"success": False, "error": result["error"]})
    if result.get("verified"):
        _stats["face_matches_verified"] += 1
    return _ok(result)


@app.post("/face/presence", tags=["face"])
async def face_presence(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    _: None = Depends(_verify_api_key),
):
    img_bytes = await file.read()
    _validate_file_size(img_bytes)
    result = FaceService.presence(img_bytes)
    if session_id:
        result["session_id"] = session_id
    return _ok(result)


@app.post("/face/quality", tags=["face"])
async def face_quality(file: UploadFile = File(...), _: None = Depends(_verify_api_key)):
    img_bytes = await file.read()
    _validate_file_size(img_bytes)
    return _ok(FaceService.quality(img_bytes))


@app.post("/face/liveness", tags=["face"])
async def face_liveness(file: UploadFile = File(...), _: None = Depends(_verify_api_key)):
    img_bytes = await file.read()
    _validate_file_size(img_bytes)
    return _ok(FaceService.liveness(img_bytes))


@app.post("/face/blink", tags=["face"])
async def face_blink(file: UploadFile = File(...), _: None = Depends(_verify_api_key)):
    img_bytes = await file.read()
    _validate_file_size(img_bytes)
    return _ok(FaceService.blink(img_bytes))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level=LOG_LEVEL.lower())
