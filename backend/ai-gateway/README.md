# AI Gateway

FastAPI microservice for face verification, OCR, and liveness detection.

## Features

- **Face Matching** — compare passport photo with selfie (DeepFace / Facenet512)
- **Presence Detection** — detect number of faces in a video frame
- **Face Analysis** — extract face embeddings
- **Face Quality** — brightness, sharpness and size validation
- **Liveness Detection** — single-frame anti-spoofing heuristic
- **Blink Detection** — eye-openness estimation
- **Passport OCR** — extract MRZ / structured data from passport images
- **Health / Readiness / Metrics** endpoints for container orchestration

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and edit configuration
cp .env.example .env

# Run (development)
DEBUG=true python main.py
```

API docs available at `http://localhost:7860/docs` (DEBUG=true only).

## Docker

```bash
# Build and run
docker-compose up --build

# Health check
curl http://localhost:7860/health
```

## Authentication

All face / OCR endpoints require an API key sent as:
- Form field: `api_key=<key>`
- Header: `X-Api-Key: <key>`

Set `AI_API_KEY` in `.env` to enable authentication.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root health check |
| GET | `/health` | Simple health check (load balancer) |
| GET | `/ready` | Readiness with config info |
| GET | `/metrics` | Performance metrics |
| POST | `/ocr/passport` | Extract passport data via OCR |
| POST | `/face/match` | Compare two face images |
| POST | `/face/presence` | Detect face presence in frame |
| POST | `/face/analyze` | Extract face embeddings |
| POST | `/face/quality` | Validate face image quality |
| POST | `/face/liveness` | Anti-spoofing check |
| POST | `/face/blink` | Blink / eye-openness detection |

## Response Format

All responses follow a consistent structure:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-02-20T10:30:45.123456+00:00",
  "request_id": "req_1_1234567890"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Invalid API Key",
  "timestamp": "2024-02-20T10:30:45.123456+00:00",
  "request_id": "req_1_1234567890"
}
```

## Configuration

See `.env.example` for all available environment variables.

## Testing

```bash
pip install pytest httpx
pytest test_main.py -v
```
