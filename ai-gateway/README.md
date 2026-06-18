---
title: AI Gateway
emoji: 🤖
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# AI Gateway — InsightFace buffalo_l

InsightFace (buffalo_l) asosidagi real-time yuz tahlil servisi.

## Endpointlar

| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/health` | Health check |
| GET | `/ready` | Model tayyor holati |
| GET | `/` | To'liq holat |
| POST | `/face/analyze` | Yuz aniqlash + ArcFace embedding |
| POST | `/face/match` | Ikkita rasm solishtirish |
| POST | `/face/presence` | Kadrda yuz bor-yo'qligini tekshirish |
| POST | `/face/quality` | Rasm sifati tekshiruvi |
| POST | `/face/liveness` | Anti-spoofing (single-frame) |
| POST | `/face/blink` | Ko'z qisishni aniqlash |

## Javob formati

```json
{"success": true, "data": {...}}
```

## Model

- **Aniqlash:** SCRFD (InsightFace)
- **Tanib olish:** ArcFace ResNet-100 (512-dim embedding)
- **Aniqlik:** ~99.7% (LFW)
- **Tezlik:** 15–30ms / frame (CPU)
