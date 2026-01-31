# Deploy cheklist (Vercel + Render + Supabase + Hugging Face)

## 0) Tayyorlangan fayllar
- `render.yaml` (Render uchun)
- `frontend/vercel.json` (Vercel uchun)
- `.env.example` fayllar: `backend/.env.example`, `backend/ai-gateway/.env.example`, `frontend/.env.example`

## 1) Supabase (Postgres)
- Supabase project oching va "Connection info" bo'limini oching.
- Sizning project ref: `pcdbqoonorfiivibjoes`
- Odatdagi qiymatlar:
  - DB_HOST=`db.pcdbqoonorfiivibjoes.supabase.co`
  - DB_NAME=`postgres`
  - DB_USER=`postgres`
  - DB_PORT=`5432`
  - DB_PASSWORD (Supabase'dan olinadi)

## 2) Backend (Render)
- Render Web Service yarating (repo connect).
- Repo rootida `render.yaml` bor, Render uni o'qiydi.
- Build/Start:
  - Build: `python -m pip install "pip<24.1" && pip install -r requirements.txt && python manage.py collectstatic --noinput`
  - Start: `daphne -b 0.0.0.0 -p $PORT config.asgi:application` (WebSocket uchun)
- Python versiya: `backend/runtime.txt` orqali `python-3.11.9` ishlatiladi.
- Render env (minimal):
  - DEBUG=false
  - SECRET_KEY=<random>
  - ALLOWED_HOSTS=<render-subdomain>
  - CORS_ALLOWED_ORIGINS=<vercel-subdomain>
  - CSRF_TRUSTED_ORIGINS=<vercel-subdomain>
  - AI_ENABLED=true
  - AI_API_KEY=<shared>
  - AI_BASE_URL=https://qwertyu6451565-ai-gataware.hf.space
  - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT
- Tekshiruv:
  - Admin login
  - `GET /api/ai/health/` (token kerak)

## 3) AI Gateway (Hugging Face Space)
- Space uchun `backend/ai-gateway` papkasini alohida repo sifatida yuklang.
- "Docker" template ishlatish tavsiya (Dockerfile bor).
- Secrets:
  - AI_API_KEY=<shared>
  - OCR_CONFIDENCE_THRESHOLD=0.2
  - OCR_LANGS=en,ru
  - OCR_GPU=false
  - OCR_MAX_SIDE=1600
  - OCR_MIN_SIDE=1200
  - OCR_CARD_DIGITS=7
  - FACE_MATCH_THRESHOLD=0.55
  - FACE_MODEL=Facenet512
  - DETECTION_BACKEND=opencv
  - FACE_MIN_AREA=2500
  - PRESENCE_THRESHOLD=0.5
  - MAX_IMAGE_SIZE_MB=8
  - DEBUG=false
- Health:
  - `GET /health` -> `{ "status": "ok" }`

## 4) Frontend (Vercel)
- Vercel import -> root: `frontend`
- Env:
  - VITE_API_BASE=<render-backend-url>
  - VITE_AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
- Tekshiruv:
  - Login va API chaqiriqlari

## 5) Agora (RTC)
- App ID frontend envda (`VITE_AGORA_APP_ID`).
- Backend envga quyidagilarni qo'ying:
  - AGORA_APP_ID
  - AGORA_APP_CERTIFICATE
  - AGORA_TOKEN_TTL
- Token endpoint:
  - `POST /api/live/agora/token/` (body: `room_id` yoki `lesson_id`)

## 6) Ehtimoliy muammolar
- Render Free 15 daqiqadan keyin "sleep" qiladi.
- `.doc` fayllar uchun `textract` tizim paketi talab qilishi mumkin (masalan, `antiword`).
- CORS/CSRF noto'g'ri bo'lsa frontenddan API ishlamaydi.
