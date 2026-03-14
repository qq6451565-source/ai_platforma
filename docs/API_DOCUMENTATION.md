# AI Gateway API Documentation

## Overview
Professional AI Gateway for Face Verification, OCR, and Liveness Detection. Built with FastAPI, supporting enterprise-grade features including comprehensive error handling, request tracking, CORS, and structured logging.

## Base URL
```
http://ai-gateway:7860
```

## Authentication
All endpoints (except health checks) require API authentication via:
- **Form Parameter**: `api_key`
- **Header**: `X-Api-Key`

Example:
```bash
curl -X POST http://ai-gateway:7860/ocr/passport \
  -H "X-Api-Key: your-api-key" \
  -F "file=@passport.jpg"
```

## Response Format
All successful API responses follow this format:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.95,
    "threshold": 0.55
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Invalid API Key",
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

## Endpoints

### Health Check Endpoints

#### GET `/`
**Description**: Root health check with uptime information

**Response** (200):
```json
{
  "status": "AI Gateway is running",
  "version": "1.0.0",
  "timestamp": "2024-02-20T10:30:45.123456",
  "uptime_seconds": 3600,
  "models_loaded": true
}
```

#### GET `/health`
**Description**: Simple health check (for load balancers)

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-02-20T10:30:45.123456"
}
```

#### GET `/ready`
**Description**: Readiness check with configuration details

**Response** (200):
```json
{
  "ready": true,
  "timestamp": "2024-02-20T10:30:45.123456",
  "config": {
    "face_match_threshold": 0.55,
    "presence_threshold": 0.5,
    "ocr_confidence_threshold": 0.0,
    "max_image_size_mb": 8
  }
}
```

---

### OCR Endpoints

#### POST `/ocr/passport`
**Description**: Extract passport data using OCR

**Parameters**:
- `file` (required): Image file containing passport document
- `api_key` (optional): API key in form data
- `X-Api-Key` header (optional): API key in header

**Request Example**:
```bash
curl -X POST http://ai-gateway:7860/ocr/passport \
  -H "X-Api-Key: your-api-key" \
  -F "file=@passport.jpg"
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "document_type": "PASSPORT",
    "mrz_line1": "P<UZB...",
    "mrz_line2": "12345678<...",
    "name_first": "John",
    "name_last": "Doe",
    "passport_number": "AA1234567",
    "birth_date": "1990-01-15",
    "expiry_date": "2030-01-15",
    "nationality": "UZ",
    "gender": "M"
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

**Error Responses**:
- `422`: File validation error (empty, invalid format, too large)
- `500`: OCR processing failed

---

### Face Matching Endpoints

#### POST `/face/match`
**Description**: Compare two face images and return verification confidence

**Parameters**:
- `passport_image` (required): Reference face image
- `selfie_image` (required): Face to verify
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Request Example**:
```bash
curl -X POST http://ai-gateway:7860/face/match \
  -H "X-Api-Key: your-api-key" \
  -F "passport_image=@passport_photo.jpg" \
  -F "selfie_image=@selfie.jpg"
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.92,
    "threshold": 0.55
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

**Error Responses**:
- `400`: Face detection failed
- `422`: File validation error
- `500`: Matching failed

---

#### POST `/face/presence`
**Description**: Detect presence of single person in image

**Parameters**:
- `file` (required): Image file
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Request Example**:
```bash
curl -X POST http://ai-gateway:7860/face/presence \
  -H "X-Api-Key: your-api-key" \
  -F "file=@photo.jpg"
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "present": true,
    "confidence": 1.0,
    "face_count": 1,
    "threshold": 0.5
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

---

### Face Analysis Endpoints

#### POST `/face/analyze`
**Description**: Analyze faces in image and extract embeddings

**Parameters**:
- `file` (required): Image file
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Response** (200):
```json
{
  "success": true,
  "data": {
    "faces_detected": 1,
    "faces": [
      {
        "embedding": [0.123, 0.456, ...],
        "confidence": 0.98,
        "box": {
          "x": 100,
          "y": 150,
          "w": 200,
          "h": 250
        }
      }
    ]
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

---

#### POST `/face/quality`
**Description**: Check face image quality for registration

**Parameters**:
- `file` (required): Image file
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Response** (200):
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "reasons": [],
    "metrics": {
      "faces_detected": 1,
      "brightness": 128.5,
      "sharpness": 150.3,
      "face_area_ratio": 0.25
    }
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

**Quality Validation Checks**:
- Brightness: 40-220 (configurable)
- Sharpness: >= 35 (configurable)
- Face detection: exactly 1 face
- Face size: 8%-75% of image (configurable)

---

### Liveness Detection Endpoints

#### POST `/face/liveness`
**Description**: Check if image is from a live person (anti-spoofing)

**Parameters**:
- `file` (required): Image file
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Response** (200):
```json
{
  "success": true,
  "data": {
    "is_live": true,
    "confidence": 0.85,
    "reasons": []
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

---

#### POST `/face/blink`
**Description**: Detect blink for liveness verification

**Parameters**:
- `file` (required): Image file
- `api_key` (optional): API key
- `X-Api-Key` header (optional): API key

**Response** (200):
```json
{
  "success": true,
  "data": {
    "blink_detected": false,
    "confidence": 0.75,
    "eyes_detected": 2,
    "faces_detected": 1,
    "reason": "ok"
  },
  "timestamp": "2024-02-20T10:30:45.123456",
  "request_id": "req_1_1234567890"
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (e.g., face not detected) |
| 401 | Unauthorized (invalid API key) |
| 422 | Unprocessable Entity (validation error) |
| 500 | Internal Server Error |

---

## Configuration

### Environment Variables
```bash
# API Configuration
AI_API_KEY=your-secure-key
REQUEST_TIMEOUT=30

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Face Detection
FACE_MATCH_THRESHOLD=0.55
PRESENCE_THRESHOLD=0.5
FACE_MODEL=Facenet512
DETECTION_BACKEND=retinaface

# Quality Thresholds
FACE_QUALITY_MIN_BRIGHTNESS=40
FACE_QUALITY_MAX_BRIGHTNESS=220
FACE_QUALITY_MIN_SHARPNESS=35
FACE_QUALITY_MIN_FACE_RATIO=0.08
FACE_QUALITY_MAX_FACE_RATIO=0.75

# OCR
OCR_CONFIDENCE_THRESHOLD=0.0
OCR_LANGS=en,ru,uz
OCR_GPU=false

# Image Processing
MAX_IMAGE_SIZE_MB=8

# Logging
LOG_PATH=/app/logs/ai-gateway.log
LOG_LEVEL=INFO
```

---

## Request Tracking

Each request receives a unique ID for tracing:
```
X-Request-ID: req_1_1234567890
```

This ID is included in all responses and logs for debugging and monitoring.

---

## Interactive API Documentation

Once the gateway is running, access:
- **Swagger UI**: `http://ai-gateway:7860/docs`
- **ReDoc**: `http://ai-gateway:7860/redoc`

---

## Rate Limiting

Rate limiting is configured via `slowapi`. Configure in production environment:
```bash
# Example: 100 requests per minute
RATELIMIT=100/minute
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Change default API_KEY**
3. **Use proper CORS configuration**
4. **Monitor logs and uptime**
5. **Cache results when possible**
6. **Use appropriate image formats (JPEG, PNG)**
7. **Implement retry logic with exponential backoff**
8. **Monitor request IDs for debugging**
