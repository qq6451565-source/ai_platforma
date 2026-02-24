# Live Dars Sahifasini Test Qilish

## 🧪 TEST QILISH BO'YICHA QO'LLANMA

---

## 🚀 LOYIHANI ISHGA TUSHIRISH

### **1. Backend**
```bash
cd backend
python manage.py runserver
```
**Kutilgan natija:** Server 8000 portda ishga tushadi

### **2. Frontend**
```bash
cd frontend
npm run dev
```
**Kutilgan natija:** Development server 5173 portda ishga tushadi

---

## 👨‍🏫 O'QITUVCHI TOMONIDAN TEST

### **Desktop (>1024px)**

#### **1. Live Darsga Kirish**
- [ ] Admin/Teacher account bilan login
- [ ] Subjects → Live dars
- [ ] Video ko'rinadi (stage)
- [ ] Controls bar ko'rinadi: [🎤] [📹] [👥] [🚪]

#### **2. Sidebar Test**
- [ ] [👥] tugmasini bosing
- [ ] Sidebar o'ngdan smooth slide qiladi
- [ ] "Ishtirokchilar (N)" ko'rinadi
- [ ] [×] close button ishlaydi
- [ ] Yana [👥] bosganda toggle qiladi

#### **3. Grouped Sections Test**
Agar talabalar bo'lsa:

**🔵 Qo'l Ko'targanlar:**
- [ ] Section ko'rinadi
- [ ] Ko'k icon + counter
- [ ] Talabalar ro'yxati
- [ ] Ko'k badge + pulsing animatsiya
- [ ] Hover qilganda glow ko'rinadi

**🟢 Tasdiqlangan:**
- [ ] Yashil section
- [ ] Verified talabalar
- [ ] Yashil badge + glow

**🔴 Tasdiqlanmagan:**
- [ ] Qizil section
- [ ] Failed talabalar
- [ ] Qizil badge

**🟡 Kutilmoqda:**
- [ ] Sariq section
- [ ] Pending talabalar
- [ ] Sariq badge

#### **4. Click Actions Test**
- [ ] Qo'l ko'targan talabani bosing
- [ ] Talaba stage'ga o'tishi kerak
- [ ] Talaba video katta ekranda ko'rinadi
- [ ] Talaba mikrofoni avtomatik ochiladi (auto-unmute)

#### **5. LocalStorage Test**
- [ ] Sidebar'ni oching
- [ ] Sahifani refresh qiling (F5)
- [ ] Sidebar hali ham ochiq turishi kerak
- [ ] Yoping va refresh qiling
- [ ] Sidebar yopiq turishi kerak

---

### **Mobile/Tablet (<1024px)**

#### **1. Bottom Strip Test**
- [ ] Sahifani kichraytirivoring (<1024px)
- [ ] Pastda horizontal strip ko'rinadi
- [ ] Talabalar kichik thumbnail'lar
- [ ] Horizontal scroll ishlaydi

#### **2. Sorted List Test**
- [ ] Qo'l ko'targanlar birinchi (🔵)
- [ ] Keyin tasdiqlangan (🟢)
- [ ] Keyin tasdiqlanmagan (🔴)
- [ ] Oxirida kutilmoqda (🟡)

#### **3. Mobile Actions**
- [ ] Qo'l ko'targan talabani bosing
- [ ] Stage'ga o'tishi kerak
- [ ] Mikrofon ochilishi kerak

---

## 👨‍🎓 TALABA TOMONIDAN TEST

### **1. Live Darsga Kirish**
- [ ] Student account bilan login
- [ ] Live darsga kiring
- [ ] O'qituvchi video ko'rinadi (katta)
- [ ] O'z thumbnail'ingiz pastda/sidebar'da

### **2. Qo'l Ko'tarish**
- [ ] [✋] tugmasini bosing
- [ ] Badgingiz ko'k bo'lishi kerak (🔵)
- [ ] Pulsing animatsiya
- [ ] O'qituvchi sidebar'da birinchi ko'radi

### **3. Stage'ga O'tish**
- [ ] O'qituvchi click qiladi
- [ ] Siz katta ekranga o'tasiz
- [ ] Mikrofoningiz avtomatik ochiladi
- [ ] Gapira olasiz

### **4. Badge Status**
- [ ] Face verification ishlaydi (backend)
- [ ] Badge 3 sekundda yangilanadi
- [ ] Yashil (🟢) - tasdiqlangan
- [ ] Qizil (🔴) - tasdiqlanmagan
- [ ] Sariq (🟡) - kutilmoqda

---

## 🤖 FACE VERIFICATION TEST

### **Backend API Test**
```bash
# Terminal'da:
curl http://localhost:8000/api/live/face/monitoring/?room_name=ROOM_NAME
```

**Kutilgan response:**
```json
{
  "room_name": "...",
  "total_participants": 10,
  "verified_participants": 8,
  "sessions": [
    {
      "user": 123,
      "user_username": "student1",
      "status": "verified",
      "success_rate": 95.5
    }
  ]
}
```

### **Frontend Polling Test**
Browser console'da:
- [ ] Network tab → XHR
- [ ] Har 3 sekundda `/api/live/face/monitoring/` request
- [ ] 200 OK response
- [ ] Badge avtomatik yangilanadi

---

## 🎨 ANIMATION TEST

### **Sidebar Animation**
- [ ] Smooth slide in (300ms)
- [ ] Smooth slide out (300ms)
- [ ] No lag, 60fps

### **Badge Animations**
**🔵 Hand Raised:**
- [ ] Pulsing glow effect
- [ ] Cyan color
- [ ] Continuous animation

**🟢 Verified:**
- [ ] Static green glow
- [ ] No animation

**🔴 Failed:**
- [ ] Shake animation on fail
- [ ] Red glow

**🟡 Pending:**
- [ ] Slow pulse (opacity)
- [ ] Yellow color

### **Hover Effects**
- [ ] Sidebar item hover → background change
- [ ] Hand raised item hover → enhanced glow
- [ ] Smooth transitions

---

## 📱 RESPONSIVE TEST

### **Breakpoint Test**

**Desktop (≥1024px):**
- [ ] Sidebar ko'rinadi (toggle bilan)
- [ ] Bottom strip yashirin
- [ ] Toggle button ishlaydi

**Tablet (768px - 1023px):**
- [ ] Sidebar yashirin
- [ ] Bottom strip ko'rinadi
- [ ] Thumbnails 100x100px

**Mobile (<768px):**
- [ ] Bottom strip ko'rinadi
- [ ] Thumbnails 80x80px
- [ ] Horizontal scroll
- [ ] Controls compact

### **Orientation Test**
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Auto-adjust

---

## 🔊 AUDIO/VIDEO TEST

### **Microphone**
- [ ] Default: enabled (teacher) / disabled (student)
- [ ] Toggle button ishlaydi
- [ ] Auto-unmute on stage (student)
- [ ] Mute/unmute smooth

### **Camera**
- [ ] Video feed ko'rinadi
- [ ] Toggle button ishlaydi
- [ ] Performance yaxshi (60fps)

### **Audio Routing**
- [ ] O'qituvchi ovozini eshitish
- [ ] Stage user ovozini eshitish
- [ ] Echo yo'q

---

## ⚡ PERFORMANCE TEST

### **CPU/Memory**
Browser DevTools → Performance:
- [ ] 60fps animations
- [ ] <100MB memory
- [ ] CPU usage normal
- [ ] No memory leaks

### **Network**
- [ ] Polling efficient (3 sek interval)
- [ ] Video bandwidth acceptable
- [ ] API responses <500ms

### **Rendering**
- [ ] No layout thrashing
- [ ] Smooth scrolling
- [ ] GPU acceleration active

---

## 🐛 BUG TEST SCENARIOS

### **Edge Cases**

**1. No Participants:**
- [ ] Sidebar empty message
- [ ] Bottom strip yashirin
- [ ] No errors

**2. Many Participants (50+):**
- [ ] Sidebar scroll ishlaydi
- [ ] Bottom strip scroll ishlaydi
- [ ] Performance yaxshi
- [ ] Grouped sections to'g'ri

**3. Network Issues:**
- [ ] Polling timeout handle
- [ ] Graceful degradation
- [ ] Error messages

**4. Face Verification API Down:**
- [ ] Pending badges (default)
- [ ] No crash
- [ ] Continue working

**5. LocalStorage Disabled:**
- [ ] Sidebar default closed
- [ ] No errors
- [ ] Functionality preserved

---

## ✅ SUCCESS CRITERIA

Barcha testlar o'tsa, loyiha tayyor:

**Core Functionality:**
- ✅ Sidebar desktop'da ishlaydi
- ✅ Bottom strip mobile'da ishlaydi
- ✅ Sorting to'g'ri (priority)
- ✅ Grouping to'g'ri (4 sections)
- ✅ Click actions ishlaydi
- ✅ Auto-unmute ishlaydi

**Face Verification:**
- ✅ Backend API ishlaydi
- ✅ Polling ishlaydi (3 sek)
- ✅ Badge colors to'g'ri
- ✅ Real-time updates

**UX/UI:**
- ✅ Animations smooth
- ✅ Responsive (all devices)
- ✅ LocalStorage saqlaydi
- ✅ Professional ko'rinish

**Performance:**
- ✅ 60fps
- ✅ Low memory
- ✅ Fast response
- ✅ No bugs

---

## 🎯 FINAL CHECK

```
[ ] Desktop test - OK
[ ] Mobile test - OK
[ ] Teacher actions - OK
[ ] Student actions - OK
[ ] Face verification - OK
[ ] Animations - OK
[ ] Responsive - OK
[ ] Performance - OK
[ ] No bugs - OK
```

**Hammasi OK bo'lsa - PRODUCTION READY!** 🚀

---

## 📞 AGAR MUAMMO BO'LSA

1. **Browser Console** - Error messages
2. **Network Tab** - API calls
3. **React DevTools** - State inspection
4. **Backend Logs** - Server errors

**Debug qiling va tuzating!**
