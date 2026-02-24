# AI Platforma - To'liq Test va Ishga Tushirish

## Hozirgi Holat

### ✅ Bajarilgan
1. **Database Migrations** - To'liq bajarildi
   - `face_embedding` maydoni qo'shildi
   - Face verification modellari yaratildi
   
2. **Backend Dependencies** - O'rnatildi
   - `requests` kutubxonasi o'rnatildi
   - Django to'g'ri ishlayapti

3. **Environment Files** 
   - `backend/.env` - Mavjud va sozlangan
   - `backend/ai-gateway/.env` - Mavjud

4. **Tizim Ma'lumotlari**
   - Foydalanuvchilar: 3 ta
   - Face image bilan: 3 ta
   - Face embedding bilan: 0 ta (AI Gateway kerak)
   - Applicants: 3 ta
   - Face verification: Yoqilgan

### 🔄 Hozir Bajarilayotgan
- AI Gateway kutubxonalarini o'rnatish

## AI Gateway Kutubxonalari

AI Gateway quyidagi asosiy kutubxonalarni talab qiladi:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `deepface` - Yuz aniqlash va embedding
- `easyocr` - Passport OCR
- `opencv-python` - Rasm qayta ishlash
- `numpy`, `pillow` - Rasm kutubxonalari

## To'liq Ishga Tushirish Jarayoni

### 1. AI Gateway Dependencies
```powershell
cd backend/ai-gateway
pip install -r requirements.txt
```

**Eslatma:** Bu jarayon uzoq davom etishi mumkin (5-10 daqiqa), chunki:
- DeepFace katta modellarni yuklab oladi (~500MB)
- TensorFlow/PyTorch o'rnatiladi
- OpenCV va boshqa CV kutubxonalar o'rnatiladi

### 2. AI Gateway ni Ishga Tushirish

**Option A: Foreground (development)**
```powershell
cd backend/ai-gateway
python main.py
```

**Option B: Background (testing)**
```powershell
.\tmp_rovodev_start_ai_gateway.ps1
```

### 3. AI Gateway Tekshirish

```powershell
# Health check
curl http://localhost:8001/health

# Swagger docs
# Browser da: http://localhost:8001/docs
```

### 4. Django Backend ni Ishga Tushirish

**Yangi terminal oynasida:**
```powershell
cd backend
python manage.py runserver
```

### 5. Face Embedding larni Generatsiya Qilish

AI Gateway ishga tushgach:
```powershell
python tmp_rovodev_fix_face_embedding.py
```

### 6. To'liq Integration Test

```powershell
python tmp_rovodev_test_integration.py
```

## Kutilayotgan Natijalar

### AI Gateway Endpoints
1. `GET /health` - Health check
2. `POST /ocr/passport` - Passport OCR
3. `POST /face/match` - Passport va selfie solishtirish
4. `POST /face/analyze` - Yuz aniqlash va embedding olish
5. `POST /face/presence` - Live darsda yuz borligini tekshirish
6. `POST /face/quality` - Yuz sifati baholash
7. `POST /face/liveness` - Liveness tekshiruvi

### Backend API Endpoints
1. `POST /api/ai/health/` - AI Gateway holatini tekshirish
2. `POST /api/ai/passport-ocr/` - Passport OCR
3. `POST /api/ai/face-match/` - Face matching
4. `POST /api/ai/presence-check/` - Presence check
5. `GET /api/ai/settings/` - AI sozlamalarini olish
6. `PATCH /api/ai/settings/` - AI sozlamalarini yangilash

### Frontend - Registration Flow
1. Foydalanuvchi `/register` sahifasiga kiradi
2. Passport rasmini yuklaydi
3. Frontend `POST /api/ai/passport-ocr/` ga yuboradi
4. AI Gateway passport ma'lumotlarini o'qiydi
5. Ma'lumotlar formaga avtomatik to'ldiriladi
6. Foydalanuvchi selfie yuklaydi
7. Frontend `POST /api/ai/face-match/` ga yuboradi
8. AI Gateway yuzlarni solishtiradi
9. Natija frontend da ko'rsatiladi
10. Ro'yxatdan o'tish tugallanadi

### Live Face Verification Flow
1. O'qituvchi live darsni boshlaydi
2. Talaba darsga qo'shiladi
3. `LiveFaceSession` yaratiladi
4. WebSocket orqali har 5 soniyada:
   - Talaba yuz rasmi yuboriladi
   - Backend `POST /api/ai/presence-check/` ga yuboradi
   - AI Gateway yuzni aniqlaydi va embedding oladi
   - User ning saqlangan embedding bilan solishtiradi
   - Natija `LiveFaceEvent` ga yoziladi
   - Real-time WebSocket orqali frontend ga yuboriladi
5. O'qituvchi monitoring panelida barcha talabalarni ko'radi

## Muammolarni Bartaraf Qilish

### AI Gateway Dependencies Error
**Muammo:** `ModuleNotFoundError: No module named 'deepface'`

**Yechim:**
```powershell
cd backend/ai-gateway
pip install deepface opencv-python easyocr
```

### Port Allaqachon Band
**Muammo:** `Address already in use: 8001`

**Yechim:**
```powershell
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess | Stop-Process

# Yoki boshqa portda ishga tushiring
# main.py da: uvicorn.run(app, host="0.0.0.0", port=8002)
```

### AI Gateway Timeout
**Muammo:** `AI Service unavailable: timeout`

**Yechim:**
1. AI Gateway ishga tushganini tekshiring
2. `backend/.env` da timeout oshiring: `AI_TIMEOUT=120`
3. Rasm hajmini kamaytiring

### Face Not Detected
**Muammo:** `No face detected`

**Yechim:**
1. Rasm sifatini oshiring
2. Yorug'lik yaxshi bo'lishini ta'minlang
3. Yuz to'g'ridan-to'g'ri kameraga qaragan bo'lsin
4. Backend AISettings da `enforce_detection=False` qiling

## Keyingi Qadamlar

1. ✅ AI Gateway dependencies o'rnatish
2. ⏳ AI Gateway ishga tushirish
3. ⏳ Face embedding larni generatsiya qilish
4. ⏳ To'liq integration test
5. ⏳ Frontend bilan integratsiya test
6. ⏳ Live face verification test
7. ⏳ Production deployment

## Performance Notes

### AI Gateway Resource Usage
- RAM: ~2-4GB (DeepFace models)
- CPU: Har bir request ~1-3 soniya (CPU only)
- GPU: Agar mavjud bo'lsa, ~0.1-0.5 soniya

### Optimizatsiya
1. GPU ni yoqing (CUDA)
2. Model caching ni yoqing
3. Rasm hajmini cheklang (max 2MB)
4. Batch processing qo'shing (ko'p request uchun)

## Production Deployment

### AI Gateway
1. Docker container sifatida deploy qiling
2. Alohida serverda ishga tushiring (GPU bilan)
3. Load balancer qo'shing (scaling uchun)
4. Health check monitoring qo'shing

### Backend
1. Gunicorn bilan ishga tushiring
2. Nginx reverse proxy qo'shing
3. PostgreSQL ishlatging (SQLite emas)
4. Redis caching qo'shing
5. Celery background tasks uchun

### Frontend
1. Vercel/Netlify ga deploy qiling
2. Environment variables to'g'ri sozlang
3. CORS sozlamalarini tekshiring
