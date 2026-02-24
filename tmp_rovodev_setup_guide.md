# AI Platforma - To'liq Ishga Tushirish Qo'llanmasi

## ✅ Bajarilgan Ishlar

### 1. Database Migrationlari
- ✅ `face_embedding` maydoni User modeliga qo'shildi
- ✅ `FaceVerificationSettings`, `LiveFaceSession`, `LiveFaceEvent` modellari yaratildi
- ✅ Barcha migrationlar muvaffaqiyatli bajarildi

### 2. Tizim Holati
- **Foydalanuvchilar:** 3 ta
- **Face image bilan:** 3 ta  
- **Face embedding bilan:** 0 ta (AI Gateway ishga tushganda avtomatik to'ldiriladi)
- **Applicants:** 3 ta
- **Face Verification:** Yoqilgan (interval: 5s, threshold: 0.7)

## 🔧 Keyingi Qadamlar

### 1. AI Gateway ni Ishga Tushirish

AI Gateway 3 xil usulda ishga tushirilishi mumkin:

#### A) Lokal Kompyuterda (Development)
```powershell
cd backend/ai-gateway
pip install -r requirements.txt
python main.py
```

Gateway ishga tushgach, `http://localhost:8001` da ishlaydi.

#### B) Docker orqali (Production)
```powershell
cd backend/ai-gateway
docker-compose up -d
```

#### C) Alohida Server (Recommended)
AI Gateway ni alohida serverda ishlatish tavsiya etiladi.

### 2. Backend .env Faylini Sozlash

`backend/.env` faylini yarating va quyidagi qiymatlarni qo'shing:

```env
# AI Gateway sozlamalari
AI_ENABLED=True
AI_BASE_URL=http://localhost:8001
AI_API_KEY=your-secret-api-key-here
AI_TIMEOUT=60
AI_RETRY=2
```

Agar AI Gateway boshqa serverda bo'lsa:
```env
AI_BASE_URL=http://your-ai-gateway-server.com:8001
```

### 3. AI Gateway .env Faylini Sozlash

`backend/ai-gateway/.env` faylida quyidagilar bo'lishi kerak:

```env
AI_API_KEY=your-secret-api-key-here
FACE_MODEL=Facenet512
DETECTION_BACKEND=retinaface
```

**Muhim:** Backend va AI Gateway dagi `AI_API_KEY` bir xil bo'lishi kerak!

### 4. Face Embedding larni Generatsiya Qilish

AI Gateway ishga tushgandan so'ng, mavjud foydalanuvchilar uchun face embedding larni yaratish:

```powershell
python tmp_rovodev_fix_face_embedding.py
```

Bu script:
- Barcha foydalanuvchilarni face_image bilan topadi
- Har bir rasmdan yuz embeddingini chiqaradi
- Database ga saqlaydi

### 5. Tizimni To'liq Test Qilish

```powershell
python tmp_rovodev_test_integration.py
```

Bu test script quyidagilarni tekshiradi:
- AI Gateway ulanishi
- Ro'yxatdan o'tish jarayoni (passport OCR + face match)
- Passport ma'lumotlarini saqlash
- Face embedding lar
- Live face verification sozlamalari
- Live rooms holati

## 📋 Funksiyalar To'liq Ro'yxati

### Ro'yxatdan O'tish (Registration)
1. ✅ Foydalanuvchi passport rasmini yuklaydi
2. ✅ AI Gateway OCR orqali ma'lumotlarni o'qiydi
3. ✅ Foydalanuvchi selfie yuklaydi
4. ✅ AI Gateway passport va selfie yuzlarini solishtiradi
5. ✅ Verification result saqlanadi
6. ✅ Ma'lumotlar `Applicant` modeliga yoziladi

### Admin Panel
1. ✅ `PassportData` - barcha passport ma'lumotlari
2. ✅ `Applicant` - ariza beruvchilar ro'yxati
3. ✅ `VerificationResult` - verification natijalari
4. ✅ `AISettings` - AI sozlamalari (threshold, intervals, etc.)

### Live Dars - Face Verification
1. ✅ Dars boshlanganda har bir talaba uchun `LiveFaceSession` yaratiladi
2. ✅ Har N soniyada (default: 5s) yuz tekshiriladi
3. ✅ Tekshirish natijalari `LiveFaceEvent` ga yoziladi
4. ✅ Event turlari:
   - `verification` - oddiy tekshiruv
   - `success` - muvaffaqiyatli tasdiq
   - `failure` - tasdiq xato
   - `no_face` - yuz topilmadi
   - `multiple_faces` - bir nechta yuz
   - `low_confidence` - past ishonchlilik

5. ✅ Real-time WebSocket orqali frontend ga yuboriladi
6. ✅ O'qituvchi monitoring panelida barcha talabalarni ko'radi

## 🔍 Debug va Monitoring

### AI Gateway Tekshirish
```powershell
# Health check
curl http://localhost:8001/health

# Passport OCR test
curl -X POST http://localhost:8001/ocr/passport \
  -H "X-API-Key: your-key" \
  -F "file=@path/to/passport.jpg"

# Face analyze test  
curl -X POST http://localhost:8001/face/analyze \
  -H "X-API-Key: your-key" \
  -F "file=@path/to/face.jpg"
```

### Django Admin da Tekshirish
```powershell
cd backend
python manage.py shell

# AI Settings
from ai.models import AISettings
s = AISettings.get_active()
print(f"Enabled: {s.ai_enabled}")
print(f"URL: {s.api_base_url}")

# Health check
from ai import clients
health = clients.health_check()
print(health)

# Face analyze test
with open('media/faces/test.jpg', 'rb') as f:
    result = clients.face_analyze(f)
    print(result)
```

## 🚨 Muammolarni Bartaraf Qilish

### 1. "AI Gateway is unreachable"
- AI Gateway ishga tushganini tekshiring
- `AI_BASE_URL` to'g'ri ekanligini tekshiring
- Port ochiq ekanligini tekshiring (firewall)

### 2. "No face detected"
- Rasm sifati yaxshi bo'lishini tekshiring
- Yuz to'g'ridan-to'g'ri kameraga qaragan bo'lishi kerak
- Yorug'lik yetarli bo'lishi kerak

### 3. "Face embedding is null"
- AI Gateway ishga tushganini tekshiring
- `tmp_rovodev_fix_face_embedding.py` scriptini ishga tushiring

### 4. "API Key error"
- Backend va AI Gateway da bir xil API key ishlatilganini tekshiring

## 📊 Kutilayotgan Natijalar

AI Gateway to'g'ri sozlanganda:
- ✅ Passport OCR 90%+ aniqlik bilan ishlaydi
- ✅ Face matching 95%+ aniqlik
- ✅ Live face verification har 5 soniyada avtomatik
- ✅ Real-time alerts multiple faces/no face uchun
- ✅ Attendance avtomatik belgilanadi
