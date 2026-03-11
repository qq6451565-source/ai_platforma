# AI Gateway Runbook

Bu fayl AI Gateway va Django backendni birga ishlatish uchun tezkor yo'riqnoma.

## 1) Talablar
- Python virtual env aktiv bo'lishi kerak (backend/venv).
- AI Gateway FastAPI servisi alohida ishlaydi.

## 2) Sozlamalar
Backend va AI Gateway **bir xil API key** ishlatishi shart.

`backend/.env`:
- `AI_ENABLED=true`
- `AI_BASE_URL=http://127.0.0.1:7860`
- `AI_API_KEY=your_secret_api_key_here`

`ai-gateway/.env`:
- `AI_API_KEY=your_secret_api_key_here`

## 3) Ishga tushirish
AI Gateway:
```
cd C:\Users\iPservice\Desktop\ai_platforma\ai-gateway
..\backend\venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 7860
```

Backend:
```
cd C:\Users\iPservice\Desktop\ai_platforma\backend
python manage.py runserver
```

## 4) Health tekshiruv
- AI Gateway: `http://127.0.0.1:7860/health`
- Backend health (admin token bilan): `GET http://127.0.0.1:8000/api/ai/health/`

## 5) Asosiy endpointlar
- OCR: `POST /api/ai/ocr/passport/` (multipart: `passport_image`)
- Face match: `POST /api/ai/face/match/` (multipart: `passport_image`, `selfie_image`)
- Presence: `POST /api/ai/face/presence/` (multipart: `session_id`, `frame`)

## 6) Muammolar
- `401 Invalid API Key`:
  - Backend va AI Gateway `AI_API_KEY` bir xil emas.
- `503 unreachable`:
  - AI Gateway ishlamayapti yoki `AI_BASE_URL` noto'g'ri.
- `OCR/Face` xatolari:
  - Fayl juda katta yoki format noto'g'ri.
