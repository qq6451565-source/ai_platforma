"""Comprehensive test of all AI Gateway endpoints."""
import requests
import io
import json
import time

BASE = "https://qwertyu6451565-ai-gataware.hf.space"
KEY = "aikeysupersekret"
H = {"X-API-Key": KEY}

results = []

# 1. Health
print("Testing health...")
r = requests.get(f"{BASE}/health", timeout=30)
d = r.json()
results.append(("health", r.status_code == 200, f"v={d.get('version')} ready={d.get('ready')}"))

# 2. Ready
print("Testing ready...")
r = requests.get(f"{BASE}/ready", timeout=30)
results.append(("ready", r.status_code == 200, f"ready={r.json().get('ready')}"))

# Get a real face image
print("Downloading real face image...")
face_r = requests.get("https://thispersondoesnotexist.com", headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
face_bytes = face_r.content
print(f"  Face image: {len(face_bytes)} bytes")

# 3. Face analyze
print("Testing face/analyze...")
buf = io.BytesIO(face_bytes)
r = requests.post(f"{BASE}/face/analyze", files={"file": ("face.jpg", buf, "image/jpeg")}, headers=H, timeout=120)
d = r.json()
data = d.get("data", {})
faces = data.get("faces", [])
emb_len = len(faces[0].get("embedding", [])) if faces else 0
results.append(("face/analyze", r.status_code == 200 and emb_len == 512, f"faces={len(faces)} emb_len={emb_len}"))

# 4. Face quality
print("Testing face/quality...")
buf = io.BytesIO(face_bytes)
r = requests.post(f"{BASE}/face/quality", files={"file": ("face.jpg", buf, "image/jpeg")}, headers=H, timeout=120)
d = r.json().get("data", {})
results.append(("face/quality", r.status_code == 200, f"valid={d.get('is_valid')} conf={d.get('confidence')}"))

# 5. Face match (same face = high score)
print("Testing face/match...")
buf1 = io.BytesIO(face_bytes)
buf2 = io.BytesIO(face_bytes)
r = requests.post(
    f"{BASE}/face/match",
    files={"passport_image": ("passport.jpg", buf1, "image/jpeg"), "selfie_image": ("selfie.jpg", buf2, "image/jpeg")},
    headers=H,
    timeout=120,
)
d = r.json().get("data", {})
conf = d.get("confidence", 0)
results.append(("face/match", r.status_code == 200 and conf > 0.5, f"confidence={conf:.4f}"))

# 6. Face liveness
print("Testing face/liveness...")
buf = io.BytesIO(face_bytes)
r = requests.post(f"{BASE}/face/liveness", files={"file": ("face.jpg", buf, "image/jpeg")}, headers=H, timeout=120)
d = r.json().get("data", {})
results.append(("face/liveness", r.status_code == 200, f"is_live={d.get('is_live')} conf={d.get('confidence')}"))

# 7. Face presence
print("Testing face/presence...")
buf = io.BytesIO(face_bytes)
r = requests.post(f"{BASE}/face/presence", files={"file": ("face.jpg", buf, "image/jpeg")}, headers=H, timeout=120)
d = r.json().get("data", {})
results.append(("face/presence", r.status_code == 200, f"present={d.get('present')} faces={d.get('faces_detected')}"))

# 8. Face blink
print("Testing face/blink...")
buf = io.BytesIO(face_bytes)
r = requests.post(f"{BASE}/face/blink", files={"file": ("face.jpg", buf, "image/jpeg")}, headers=H, timeout=120)
d = r.json().get("data", {})
results.append(("face/blink", r.status_code == 200, f"blink={d.get('blink_detected')}"))

# Print summary
print("\n" + "=" * 60)
print("AI Gateway Endpoint Test Results")
print("=" * 60)
for name, ok, detail in results:
    status = "✅ PASS" if ok else "❌ FAIL"
    print(f"  {status}  {name}: {detail}")
print("=" * 60)
passes = sum(1 for _, ok, _ in results if ok)
print(f"  TOTAL: {passes}/{len(results)} passed")
print("=" * 60)
