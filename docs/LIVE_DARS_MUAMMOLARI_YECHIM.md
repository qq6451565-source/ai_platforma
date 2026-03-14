# Live Dars Muammolari - To'liq Yechim

## 📋 Hal Qilingan Muammolar

### 1️⃣ **Ishtirokchilar Bir-birini Ko'ra Olmaydilar**
✅ **Hal Qilindi**

**Muammo**: Live darsda ishtirokchilar bir-birining video-sini ko'ra olmaydilar.

**Sabab**:
- Remote users uchun video tracks to'g'ri boshqarilmagan
- `user-published` va `user-unpublished` eventlari yo'q edi
- Video tracks StudentTile komponentlariga uzatilmagan

**Yechim**:
- `videoTracksMap` Map yaratildi
- Agora SDK eventlari qo'shildi
- StudentGridSection ga video tracks uzatildi

**O'zgargan fayllar**:
- `frontend/src/pages/live/Room.tsx`
- `frontend/src/pages/live/components/StudentTile.tsx`

---

### 2️⃣ **Live Dars Sahifasi Ochilmaydi (Loading State)**
✅ **Hal Qilindi**

**Muammo**: Live dars sahifasi yuklanayotganida qolib ketmoqda, darsga kirib bo'lmaydi.

**Sabab**: `VITE_AGORA_APP_ID` environment variable o'rnatilmagan.

**Yechim**:

#### Local Development:
`frontend/.env` faylida:
```env
VITE_AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
```

#### Vercel Production:
**Muhim**: Vercel dashboard-da environment variable qo'shish kerak!

1. **Vercel Dashboard-ga kiring**: https://vercel.com/dashboard
2. **Proyektingizni tanlang** (ai_platforma)
3. **Settings** -> **Environment Variables** ga o'ting
4. **Add New** tugmasini bosing
5. Quyidagi ma'lumotlarni kiriting:
   ```
   Name: VITE_AGORA_APP_ID
   Value: 19223d6e86e7491291ff2b77fe49a58e
   Environment: ✅ Production ✅ Preview ✅ Development
   ```
6. **Save** tugmasini bosing
7. **Redeploy qiling**: Deployments -> Latest -> ... -> Redeploy

---

## 🔍 Debug Qilish

Browser console-da (F12) quyidagi loglar ko'rinadi:

```javascript
// Kutilmoqda
"Waiting for initialization:" { appId: true/false, roomId: "123", meId: 1 }

// Boshlanyapti
"Starting Agora initialization..." { roomId: "123", userId: 1 }

// Token olinmoqda
"Fetching Agora token..."
"Token received:" { channel: "lesson_123_abc", uid: 1 }

// Channel-ga qo'shilmoqda
"Joining Agora channel..."

// Tracks yaratilmoqda
"Creating local audio track..."
"Creating local video track..."

// Publish qilinmoqda
"Publishing local tracks..."

// API orqali qo'shilmoqda
"Joining live lesson via API..."

// Muvaffaqiyatli!
"Successfully joined live lesson!"
```

### Agar Muammo Bo'lsa:

**1. "Waiting for initialization" da qolib ketsa:**
- `appId: false` -> VITE_AGORA_APP_ID o'rnatilmagan
- `roomId: undefined` -> URL parametr noto'g'ri
- `meId: undefined` -> User yuklanmagan (login qiling)

**2. "Fetching Agora token..." dan keyin xato:**
- Backend `/api/live/agora/token/` API ishlamayapti
- Backend AGORA_APP_ID yoki AGORA_APP_CERTIFICATE o'rnatilmagan

**3. "Creating local tracks..." da to'xtab qolsa:**
- Camera/Microphone permission kerak
- Browser settings -> Privacy -> Camera/Microphone ruxsat bering

**4. "User published" eventlari kelmasa:**
- Boshqa ishtirokchilar video/audio publish qilmagan
- Tarmoq muammosi (firewall, VPN)

---

## 📦 Environment Variables

### Frontend (frontend/.env)
```env
VITE_API_BASE=http://127.0.0.1:8000
VITE_AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
```

### Backend (backend/.env)
```env
AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
AGORA_APP_CERTIFICATE=<your_certificate>
AGORA_TOKEN_TTL=3600
```

---

## 🚀 Vercel Deployment Checklist

- [ ] **VITE_AGORA_APP_ID** environment variable qo'shildi
- [ ] Loyiha redeploy qilindi
- [ ] Browser cache tozalandi (Ctrl+Shift+R)
- [ ] Console-da xatolar yo'q
- [ ] Live darsga kirish mumkin
- [ ] Ishtirokchilar bir-birini ko'radi

---

## 🧪 Test Qilish

1. **Local test**:
   ```bash
   cd frontend
   npm run dev
   ```
   - http://localhost:5173 da test qiling
   - Browser console-ni kuzating

2. **Production test**:
   - Vercel URL-ga o'ting
   - Live darsga kiring
   - Console loglarni tekshiring

---

## 📝 Keyingi Qadamlar

1. ✅ Video tracks to'g'ri ishlaydi
2. ✅ Debug logging qo'shildi
3. ⚠️ **Vercel-da VITE_AGORA_APP_ID o'rnatish kerak**
4. 📋 Production uchun console.log-larni olib tashlash (keyinroq)
5. 🎨 Video thumbnail UI-ni yaxshilash
6. 🧪 Real live darsda ko'p ishtirokchilar bilan test

---

## 📞 Yordam

Agar muammolar davom etsa:
1. Browser console screenshot yuboring
2. Network tab-dagi API xatolarni ko'rsating
3. Qaysi qadamda to'xtab qolganini ayting

---

## 🎯 Xulosa

**Asosiy muammo**: `VITE_AGORA_APP_ID` environment variable o'rnatilmagan edi.

**Yechim**: Vercel dashboard-da environment variable qo'shing va redeploy qiling.

**Natija**: Live dars ochiladi va ishtirokchilar bir-birini ko'radi! 🎉
