FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev wget \
    build-essential g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=7860
ENV LOG_LEVEL=INFO
ENV FACE_MATCH_THRESHOLD=0.55
ENV MAX_FILE_SIZE_MB=10
ENV INSIGHTFACE_MODEL_ROOT=/tmp/insightface_models

# Optional preload - skip on failure (models load lazily on first request)
RUN python preload_models.py || echo "⚠️ Preload skipped, will load on first request"

EXPOSE 7860

# Start with explicit log output
CMD ["sh", "-c", "echo 'Starting AI Gateway on port 7860...' && uvicorn main:app --host 0.0.0.0 --port 7860 --workers 1 --log-level info"]
