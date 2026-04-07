import requests, re

r = requests.get('https://ai-platforma.vercel.app/assets/index-BUVw1Qzo.js', timeout=15)
text = r.text
print(f"JS size: {len(text)} chars")

# Search for API base URL
for pattern in ['onrender', 'localhost', 'VITE_API', 'baseURL', 'api_base', 'axios.create']:
    indices = [m.start() for m in re.finditer(pattern, text)]
    if indices:
        for idx in indices[:3]:
            snippet = text[max(0,idx-40):idx+80].replace('\n', ' ')
            print(f"[{pattern}] at {idx}: ...{snippet}...")
    else:
        print(f"[{pattern}]: NOT FOUND")
