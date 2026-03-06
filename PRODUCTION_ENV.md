# ==================== Production Deployment Guide ====================
# Frontend: Vercel | Backend: Render | AI Gateway: HuggingFace | Live: Agora
# ======================================================================

# ── 1. HUGGINGFACE SPACE (AI Gateway) ────────────────────────────────────────
# Space Settings → Variables → Secret Variables ga kiriting:
# (Barcha qiymatlarni o'zgartiring!)

AI_API_KEY=SIZNING_YASHIRIN_KALITINGIZ       # Xavfsiz, uzun random string
FACE_MATCH_THRESHOLD=0.55                     # 0.5-0.65 optimal
PRESENCE_THRESHOLD=0.5
FACE_MODEL=Facenet512                         # yoki ArcFace (tezroq)
DETECTION_BACKEND=opencv                      # HF CPU uchun optimal
OCR_CONFIDENCE_THRESHOLD=0.0
MAX_IMAGE_SIZE_MB=8
AI_CONCURRENCY=1                              # HF Space CPU = 1 yoki 2
AI_PROCESS_TIMEOUT=90
OCR_LANGS=en,ru
LOG_PATH=/tmp/ai-gateway.log                  # HF Space /tmp yoziladi
ALLOWED_ORIGINS=https://sizning-frontend.vercel.app,https://sizning-backend.onrender.com


# ── 2. RENDER (Backend / Django) ─────────────────────────────────────────────
# Render Dashboard → Environment Variables ga kiriting:

SECRET_KEY=DJANGO_UCHUN_UZUN_YASHIRIN_KALIT   # 50+ belgi
DEBUG=false
ALLOWED_HOSTS=sizning-backend.onrender.com

# Database (Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname

# CORS — Frontend URL
CORS_ALLOWED_ORIGINS=https://sizning-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://sizning-frontend.vercel.app
CORS_ALLOW_ALL_ORIGINS=false

# AI Gateway — HuggingFace Space URL
# Format: https://USERNAME-SPACE-NAME.hf.space
AI_ENABLED=true
AI_BASE_URL=https://sizning-username-ai-gateway.hf.space
AI_API_KEY=SIZNING_YASHIRIN_KALITINGIZ        # HF dagi bilan BIR XIL!
AI_TIMEOUT=90
AI_RETRY=1

# Davomat / Proctoring
FACE_ATTENDANCE_PRESENT_RATIO=0.50
FACE_ATTENDANCE_MIN_SAMPLES=3
FACE_ATTENDANCE_WINDOW_SECONDS=60
PROCTOR_MIN_FACE_RATIO=0.50

# Agora (Live Dars)
AGORA_APP_ID=sizning_agora_app_id
AGORA_APP_CERTIFICATE=sizning_agora_sertifikati
AGORA_TOKEN_TTL=3600

# Email (ixtiyoriy)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=sizning@email.com
EMAIL_HOST_PASSWORD=app_parol
EMAIL_USE_TLS=true

# Media fayllari (Render ephemeral — S3 tavsiya, lekin hozircha local)
MEDIA_URL=/media/


# ── 3. VERCEL (Frontend / React) ─────────────────────────────────────────────
# Vercel Dashboard → Settings → Environment Variables ga kiriting:

VITE_API_URL=https://sizning-backend.onrender.com
VITE_AGORA_APP_ID=sizning_agora_app_id
# AI Gateway bevosita frontenddan chaqirilmaydi — backend orqali!


# ── 4. AGORA SETUP ────────────────────────────────────────────────────────────
# 1. https://console.agora.io → Create Project
# 2. AGORA_APP_ID va AGORA_APP_CERTIFICATE ni oling
# 3. Render va Vercel ga yuqoridagi kabi kiriting


# ── 5. MUHIM ESLATMALAR ───────────────────────────────────────────────────────
# ❶ AI_API_KEY HF Space va Render da BIR XIL bo'lishi SHART
# ❷ HF Space URL format: https://USERNAME-SPACENAME.hf.space
#    (Masalan: https://john-ai-platforma.hf.space)
# ❸ HF Free tier: 16GB RAM, 2 vCPU — Facenet512+opencv uchun yetarli
# ❹ Render Free tier: Sleep after 15 min — Paid plan tavsiya
# ❺ Media fayllar: Render disk ephemeral — Cloudinary yoki S3 qo'shing
