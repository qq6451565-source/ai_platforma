# Live Dars Ochilmasligi Muammosi - Debug Guide

## Muammo
Live dars sahifasi yuklanayotganida qolib ketmoqda (stuck in loading state).

## Sabab
`VITE_AGORA_APP_ID` environment variable o'rnatilmagan.

## Yechim

### 1. Local Development uchun
`frontend/.env` faylida quyidagi qatorni qo'shing:
```env
VITE_AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
```

### 2. Vercel Production uchun
Vercel dashboard-da environment variable qo'shing:

1. Vercel dashboard-ga kiring: https://vercel.com
2. Loyihangizni tanlang
3. Settings -> Environment Variables ga o'ting
4. Yangi variable qo'shing:
   - **Name**: `VITE_AGORA_APP_ID`
   - **Value**: `19223d6e86e7491291ff2b77fe49a58e`
   - **Environment**: Production, Preview, Development (hammasi)
5. Save tugmasini bosing
6. Loyihani qayta deploy qiling yoki yangi commit qiling

### 3. Debug Logging

Kodga debug logging qo'shildi:
- `console.log("Waiting for initialization:", ...)` - appId, roomId, me.id kutilmoqda
- `console.log("Starting Agora initialization...")` - Agora boshlanyapti
- `console.log("Fetching Agora token...")` - Token olinmoqda
- `console.log("Creating local tracks...")` - Video/audio track yaratilmoqda
- `console.log("Successfully joined live lesson!")` - Muvaffaqiyatli qo'shildi

Browser console-da bu loglarni ko'rishingiz mumkin va qayerda to'xtab qolganini aniqlashingiz mumkin.

## Tekshirish

1. Browser console-ni oching (F12)
2. Live dars sahifasiga o'ting
3. Console loglarni kuzating:
   - Agar "Waiting for initialization" ko'rinsa va `appId: false` bo'lsa -> VITE_AGORA_APP_ID o'rnatilmagan
   - Agar "Fetching Agora token..." dan keyin xato bo'lsa -> Backend muammosi
   - Agar "Creating local tracks..." da to'xtab qolsa -> Camera/microphone permission kerak

## Environment Variables Ro'yxati

Frontend uchun zarur environment variables:

```env
# API Base URL
VITE_API_BASE=http://127.0.0.1:8000

# Agora App ID (Live darslar uchun)
VITE_AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
```

Backend uchun zarur environment variables (backend/.env):

```env
# Agora Settings
AGORA_APP_ID=19223d6e86e7491291ff2b77fe49a58e
AGORA_APP_CERTIFICATE=your_certificate_here
AGORA_TOKEN_TTL=3600
```

## Qo'shimcha Debugging

Agar muammo davom etsa:

1. **Browser console xatolarini tekshiring**
2. **Network tab-da API chaqiruvlarni kuzating**:
   - `/api/live/agora/token/` - Token olish
   - `/api/live/join/{lesson_id}/` - Darsga qo'shilish
3. **Camera/Microphone ruxsatlarini tekshiring**:
   - Browser settings -> Privacy -> Camera/Microphone
4. **Agora SDK versiyasini tekshiring**:
   - `package.json`-da `agora-rtc-sdk-ng` versiyasi

## Video Ko'rinishi Muammosi

Agar live dars ochilsa lekin ishtirokchilar ko'rinmasa:
- `LIVE_VIDEO_FIX_SUMMARY.md` faylini o'qing
- Video tracks to'g'ri boshqarilganligini tekshiring
- `user-published` eventlari ishlayotganligini tekshiring

## Keyingi Qadamlar

1. ✅ Debug logging qo'shildi
2. ⚠️ Vercel-da VITE_AGORA_APP_ID o'rnatish kerak
3. 📝 Production uchun console.log-larni olib tashlash
4. 🧪 Real live darsda test o'tkazish
