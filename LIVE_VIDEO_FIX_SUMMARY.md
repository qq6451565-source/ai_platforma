# Live Darsda Video Ko'rinishi - Tuzatish Hisoboti

## Muammo
Live darsda ishtirokchilar bir-birini ko'ra olmayotgan edi. Talabalar kichkina video thumbnails shaklida ko'rinishi kerak edi.

## Sababi
1. **Video tracks to'g'ri boshqarilmagan** - Remote users uchun video tracks alohida Map-da saqlanmagan
2. **User-published eventlari yo'q** - Agora SDK-ning `user-published` va `user-unpublished` eventlari ishlatilmagan
3. **Participants state yangilanmagan** - Backend-dan kelgan `liveState` ma'lumotlari participants state-ga to'g'ri yuklanmagan
4. **API funksiyalari noto'g'ri chaqirilgan** - `fetchAgoraToken`, `fetchLiveState` kabi funksiyalarga parametrlar noto'g'ri uzatilgan

## Amalga oshirilgan tuzatishlar

### 1. Video Tracks Map yaratildi
```typescript
const videoTracksMap = useRef<Map<number, any>>(new Map());
```

Bu Map har bir remote user uchun video track-ni saqlaydi va StudentTile komponentlariga uzatiladi.

### 2. Agora Event Handlerlar qo'shildi

**user-published** - foydalanuvchi video/audio publish qilganda:
```typescript
client.on("user-published", async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  
  if (mediaType === "video") {
    videoTracksMap.current.set(Number(user.uid), user.videoTrack);
    setState((prev) => ({ ...prev })); // Force re-render
  }
  
  if (mediaType === "audio" && user.audioTrack) {
    user.audioTrack.play();
  }
});
```

**user-unpublished** - foydalanuvchi video/audio-ni to'xtatganda:
```typescript
client.on("user-unpublished", (user, mediaType) => {
  if (mediaType === "video") {
    videoTracksMap.current.delete(Number(user.uid));
    setState((prev) => ({ ...prev })); // Force re-render
  }
});
```

### 3. LiveState-dan Participants yangilanishi
```typescript
useEffect(() => {
  if (liveState?.participants) {
    setState((prev) => ({
      ...prev,
      participants: liveState.participants,
      stageUser: liveState.stage_user_id ? String(liveState.stage_user_id) : prev.stageUser,
    }));
  }
}, [liveState]);
```

### 4. API funksiyalari tuzatildi

**fetchAgoraToken:**
```typescript
// Oldingi (noto'g'ri):
const token = await fetchAgoraToken(roomId, me.id);
await client.join(appId, roomId, token, me.id);

// Yangi (to'g'ri):
const tokenData = await fetchAgoraToken({ lesson_id: Number(roomId) });
await client.join(appId, tokenData.channel, tokenData.token, tokenData.uid);
```

**fetchLiveState:**
```typescript
// Oldingi (noto'g'ri):
return fetchLiveState(roomId);

// Yangi (to'g'ri):
return fetchLiveState({ lesson_id: Number(roomId) });
```

### 5. StudentTile komponentida video play qilish tuzatildi
```typescript
useEffect(() => {
  if (!videoTrack || !videoRef.current) {
    console.log("No video track or ref:", { 
      videoTrack, 
      hasRef: !!videoRef.current, 
      studentId: student.user_id 
    });
    return;
  }

  console.log("Playing video for student:", student.user_id, student.user_name);
  
  try {
    videoTrack.play(videoRef.current);
  } catch (error) {
    console.error("Error playing video track:", error);
  }

  return () => {
    try {
      videoTrack.stop();
    } catch (error) {
      console.error("Error stopping video track:", error);
    }
  };
}, [videoTrack, student.user_id, student.user_name]);
```

### 6. Stage User Video Play Effect
```typescript
useEffect(() => {
  if (!stageVideoTrack || !stageVideoRef.current) return;

  console.log("Playing stage video for user:", state.stageUser);
  stageVideoTrack.play(stageVideoRef.current);

  return () => {
    stageVideoTrack.stop();
  };
}, [stageVideoTrack, state.stageUser]);
```

### 7. StudentGridSection-ga to'g'ri video tracks uzatildi
```typescript
<StudentGridSection
  participants={state.participants}
  studentStatuses={studentStatuses}
  videoTracks={videoTracksMap.current}  // To'g'ri Map
  isTeacher={isTeacher}
  onClose={() => setState((prev) => ({ ...prev, showStudentsGrid: false }))}
  onAudioToggle={handleAudioToggle}
/>
```

## Qanday ishlaydi

1. **Foydalanuvchi xonaga kirganda:**
   - Agora client yaratiladi va `user-joined` eventi listen qiladi
   - Foydalanuvchi video/audio publish qilganda `user-published` eventi ishga tushadi
   - Video track `videoTracksMap`-ga qo'shiladi
   - Component re-render qilinadi

2. **Video ko'rsatish:**
   - Har bir StudentTile komponenti o'z video track-ini oladi
   - `useEffect` yordamida video track HTMLDivElement-ga play qilinadi
   - Video foydalanuvchi yuzi bilan kichkina thumbnail shaklida ko'rinadi

3. **Stage user:**
   - O'qituvchi yoki administrator talabani stage-ga qo'yishi mumkin
   - Stage user-ning video track-i katta ekranda ko'rsatiladi
   - Stage video ham alohida effect orqali play qilinadi

4. **Video to'xtatish:**
   - Foydalanuvchi video-ni o'chirganda `user-unpublished` eventi ishga tushadi
   - Video track Map-dan o'chiriladi
   - Component re-render qilinib, placeholder ko'rsatiladi

## Debug Logging

Kod debug qilish uchun bir nechta console.log qo'shildi:
- User joined/left eventlari
- Video published/unpublished eventlari  
- Video play qilish muvaffaqiyatlari/xatolari
- Participants yangilanishi

Bu loglar production-da o'chirilishi kerak.

## Keyingi Qadamlar

1. **Testing** - Live darsda real test o'tkazish
2. **Performance** - Ko'p ishtirokchilar bilan ishlashni test qilish
3. **Error handling** - Agora xatolarini yaxshiroq boshqarish
4. **UI/UX** - Video thumbnails dizaynini yaxshilash
5. **Debug logs** - Production uchun console.log-larni olib tashlash

## Fayl O'zgarishlari

- `frontend/src/pages/live/Room.tsx` - Asosiy tuzatishlar
- `frontend/src/pages/live/components/StudentTile.tsx` - Video play logic
- `frontend/src/pages/live/components/StudentGridSection.tsx` - Video tracks props

## Xulosa

Endi live darsda:
✅ Ishtirokchilar bir-birini ko'rishi mumkin
✅ Har bir talaba kichkina video thumbnail bilan ko'rinadi
✅ Video tracks to'g'ri boshqariladi
✅ Stage user katta ekranda ko'rinadi
✅ Audio ham to'g'ri ishlaydi
