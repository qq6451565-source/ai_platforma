# AI Gateway - Professional Deployment Guide

## Overview
This guide covers deploying the AI Gateway in production environments including Docker, Kubernetes, and cloud platforms.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Docker Deployment](#docker-deployment)
3. [Production Configuration](#production-configuration)
4. [Monitoring & Logging](#monitoring--logging)
5. [Performance Tuning](#performance-tuning)
6. [Security](#security)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Run the gateway
python main.py
```

Access API docs at: `http://localhost:7860/docs`

---

## Docker Deployment

### Build Image
```bash
docker build -t ai-gateway:1.0.0 .
```

### Run Container
```bash
docker run -d \
  --name ai-gateway \
  -p 7860:7860 \
  -e AI_API_KEY=your-secure-key \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e FACE_MATCH_THRESHOLD=0.55 \
  -v /app/logs \
  ai-gateway:1.0.0
```

### Docker Compose
```bash
docker-compose up -d
```

### Check Logs
```bash
docker logs -f ai-gateway
```

---

## Production Configuration

### Environment Variables

#### Critical Settings
```bash
# Security
AI_API_KEY=<generate-strong-key>
DEBUG=false

# CORS (comma-separated)
ALLOWED_ORIGINS=https://yourfrontend.com,https://admin.yourfrontend.com

# Database/Caching
REDIS_URL=redis://redis:6379/0  # Optional
```

#### Performance Tuning
```bash
# Request timeout
AI_PROCESS_TIMEOUT=45
AI_CONCURRENCY=2

# Image limits
MAX_IMAGE_SIZE_MB=10

# Face detection
FACE_MATCH_THRESHOLD=0.55
FACE_MODEL=Facenet512
DETECTION_BACKEND=retinaface

# Quality thresholds
FACE_QUALITY_MIN_BRIGHTNESS=40
FACE_QUALITY_MAX_BRIGHTNESS=220
FACE_QUALITY_MIN_SHARPNESS=35
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-gateway
  labels:
    app: ai-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-gateway
  template:
    metadata:
      labels:
        app: ai-gateway
    spec:
      containers:
      - name: ai-gateway
        image: ai-gateway:1.0.0
        ports:
        - containerPort: 7860
        env:
        - name: AI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-gateway-secrets
              key: api-key
        - name: ALLOWED_ORIGINS
          value: "https://yourfrontend.com"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 7860
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 7860
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: ai-gateway-service
spec:
  selector:
    app: ai-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 7860
  type: LoadBalancer
```

### Deploy to Kubernetes
```bash
# Create secrets
kubectl create secret generic ai-gateway-secrets \
  --from-literal=api-key=your-secure-key

# Deploy
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get pods -l app=ai-gateway
kubectl logs -f deployment/ai-gateway

# Scale
kubectl scale deployment ai-gateway --replicas=5
```

---

## Monitoring & Logging

### Metrics Endpoint
```bash
curl -X GET http://localhost:7860/metrics
```

Response includes:
- Request statistics (count, errors, avg response time)
- Endpoint performance metrics
- Face matching success rates
- OCR operation statistics
- Authentication failures

### Log Files
```bash
# Main logs
tail -f /app/logs/ai-gateway.log

# Structured logs
docker logs ai-gateway | grep "face/match"
```

### Integration with ELK Stack
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/ai-gateway.log
  json.message_key: message
  json.keys_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### Prometheus Metrics Export
Create `prometheus_metrics.py`:
```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import Response

face_matches = Counter(
    'face_matches_total',
    'Total face matching attempts',
    ['status']
)

request_duration = Histogram(
    'request_duration_seconds',
    'HTTP request latency'
)

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

---

## Performance Tuning

### CPU & Memory Optimization
```bash
# Recommended specs
CPU: 4 cores minimum, 8+ cores recommended
RAM: 4GB minimum, 8GB+ recommended
GPU: Optional (enables faster face detection)
```

### Load Balancing
```nginx
# nginx.conf
upstream ai-gateway {
    server ai-gateway-1:7860;
    server ai-gateway-2:7860;
    server ai-gateway-3:7860;
    least_conn;
}

server {
    listen 80;
    location / {
        proxy_pass http://ai-gateway;
        proxy_set_header X-Api-Key $http_x_api_key;
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
    }
}
```

### Caching Responses
```python
from functools import lru_cache
from datetime import timedelta

@lru_cache(maxsize=1000)
def cached_face_analysis(image_hash):
    # Implementation
    pass
```

### Async Processing
```python
from celery import Celery

celery_app = Celery('ai-gateway')

@celery_app.task
def analyze_face_async(image_data):
    return analyze_faces(image_data)
```

---

## Security

### API Key Management
```bash
# Generate strong key
openssl rand -hex 32

# Store in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
```

### SSL/TLS Configuration
```bash
# Docker Compose with SSL
volumes:
  - ./certs/:/app/certs/

environment:
  - SSL_CERTFILE=/app/certs/cert.pem
  - SSL_KEYFILE=/app/certs/key.pem
```

### Rate Limiting
```python
# Enable rate limiting in production
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/face/match")
@limiter.limit("10/minute")
async def face_match(...):
    ...
```

### Input Validation
- All file uploads validated
- Content-type checking enabled
- File size limits enforced (8MB default)
- Timeout protection (30s default)

### Audit Logging
```python
# All requests logged with request ID
# Access logs: GET /health - 200 - 0.05s
# Error logs: POST /face/match - 500 - [error details]
```

---

## Troubleshooting

### Gateway Won't Start
```bash
# Check logs
docker logs ai-gateway

# Common issues:
# - Port already in use: Change port in .env
# - GPU not available: Set FACE_MODEL=VGGFace2
# - Memory insufficient: Increase container memory limit
```

### High Latency
```bash
# Check metrics
curl http://localhost:7860/metrics | grep avg_time

# Solutions:
# - Add more replicas/workers
# - Increase CPU allocation
# - Enable GPU support
# - Check network connectivity
```

### Face Detection Failures
```bash
# Check image quality
curl -X POST http://localhost:7860/face/quality \
  -H "X-Api-Key: key" \
  -F "file=@image.jpg"

# Common causes:
# - Poor image quality
# - Face too small/large
# - Multiple faces in image
# - Non-frontal face angle
```

### Memory Leaks
```bash
# Monitor memory usage
docker stats ai-gateway

# Restart container
docker restart ai-gateway

# Set memory limits
docker run -m 4g ai-gateway:1.0.0
```

### Authentication Issues
```bash
# Verify API key
echo "API_KEY=your-key" > .env

# Test endpoint
curl -X GET \
  -H "X-Api-Key: your-key" \
  http://localhost:7860/health
```

### Database Connection Issues
```bash
# Check connectivity
curl http://localhost:6379  # Redis

# Verify environment variables
docker exec ai-gateway env | grep REDIS
```

---

## Performance Benchmarks

Typical performance on standard hardware:

| Operation | Avg Time | P95 | P99 |
|-----------|----------|-----|-----|
| Face Match | 800ms | 1200ms | 1500ms |
| Liveness Check | 300ms | 500ms | 700ms |
| OCR (Passport) | 500ms | 800ms | 1000ms |
| Health Check | 5ms | 10ms | 20ms |

---

## Support

For issues or questions:
1. Check logs: `docker logs ai-gateway`
2. Review metrics: `curl http://localhost:7860/metrics`
3. Check API docs: `http://localhost:7860/docs`
4. Review this guide

---

## Version Information

- **AI Gateway Version**: 1.0.0
- **FastAPI**: Latest
- **Python**: 3.10+
- **DeepFace**: Latest
- **EasyOCR**: Latest

---

Last updated: 2024-02-20
