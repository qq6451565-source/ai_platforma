# 🎨 Tema Tizimi Hujjatlari / Theme System Documentation

## 📋 Umumiy Ma'lumot / Overview

Ushbu loyihada markazlashtirilgan tema tizimi mavjud bo'lib, u dizaynni **bitta joydan** boshqarishga imkon beradi. Barcha ranglar, shriftlar, oraliqlar va boshqa dizayn elementlari bir nechta faylda to'plangan.

This project has a centralized theme system that allows you to control the design from **one place**. All colors, fonts, spacing, and other design elements are collected in a few files.

---

## 📁 Asosiy Fayllar / Main Files

### 1️⃣ `frontend/src/styles/theme-config.css`
**Eng muhim fayl!** Bu yerda barcha dizayn sozlamalari mavjud.

```css
:root {
  /* Ranglar / Colors */
  --theme-primary: #3B82F6;           /* Asosiy rang */
  --theme-bg-primary: #FFFFFF;        /* Orqa fon */
  --theme-text-primary: #0F172A;      /* Matn rangi */
  
  /* Shriftlar / Fonts */
  --theme-font-family: 'Inter', sans-serif;
  --theme-font-base: 0.9375rem;       /* 15px */
  
  /* Oraliqlar / Spacing */
  --theme-space-4: 1rem;              /* 16px */
  
  /* Va boshqalar... */
}
```

### 2️⃣ `frontend/src/styles/theme-presets.css`
8 ta tayyor dizayn mavzusi:
- Professional White (Hozirgi)
- Modern Dark (Qora tema)
- Ocean Blue (Ko'k)
- Sunset Orange (To'q sariq)
- Forest Green (Yashil)
- Royal Purple (Binafsha)
- Rose Pink (Pushti)
- Minimal Gray (Kulrang)

### 3️⃣ `frontend/src/utils/themeManager.ts`
Tema bilan ishlash uchun TypeScript funksiyalari.

### 4️⃣ `frontend/src/components/ThemeSwitcher/`
Foydalanuvchi uchun tema o'zgartirish komponenti.

---

## 🚀 Qanday Ishlatish / How to Use

### Usul 1: Ranglarni O'zgartirish (Eng Oson)
1. `frontend/src/styles/theme-config.css` faylini oching
2. Kerakli rangni toping, masalan:
   ```css
   --theme-primary: #3B82F6;  /* Ko'k rang */
   ```
3. Rangni o'zgartiring:
   ```css
   --theme-primary: #FF5733;  /* Qizil rang */
   ```
4. Faylni saqlang - barcha joyda rang o'zgaradi! ✨

### Usul 2: Tayyor Mavzuni Tanlash
1. HTML fayliga class qo'shing:
   ```html
   <html class="theme-ocean-blue">
   ```
2. Yoki JavaScript orqali:
   ```javascript
   import { applyTheme } from './utils/themeManager';
   applyTheme('ocean-blue');
   ```

### Usul 3: Komponent Orqali O'zgartirish
```tsx
import { ThemeSwitcher } from './components/ThemeSwitcher';

function Settings() {
  return (
    <div>
      <h1>Sozlamalar</h1>
      <ThemeSwitcher />
    </div>
  );
}
```

### Usul 4: Kod Orqali Maxsus Rang
```typescript
import { applyCustomTheme } from './utils/themeManager';

applyCustomTheme({
  primary: '#FF5733',
  bgPrimary: '#FFFFFF',
  textPrimary: '#000000'
});
```

---

## 🎨 Barcha Sozlanuvchi Parametrlar / All Configurable Parameters

### Ranglar / Colors
| O'zgaruvchi | Tavsif | Standart |
|------------|--------|----------|
| `--theme-primary` | Asosiy rang | #3B82F6 |
| `--theme-secondary` | Ikkinchi rang | #6366F1 |
| `--theme-bg-primary` | Asosiy fon | #FFFFFF |
| `--theme-bg-secondary` | Ikkinchi fon | #F8FAFC |
| `--theme-text-primary` | Asosiy matn | #0F172A |
| `--theme-text-secondary` | Ikkinchi matn | #475569 |
| `--theme-success` | Muvaffaqiyat | #10B981 |
| `--theme-error` | Xato | #EF4444 |
| `--theme-warning` | Ogohlantirish | #F59E0B |

### Shriftlar / Typography
| O'zgaruvchi | Tavsif | Standart |
|------------|--------|----------|
| `--theme-font-family` | Asosiy shrift | Inter |
| `--theme-font-heading` | Sarlavha shrifti | Plus Jakarta Sans |
| `--theme-font-xs` | Juda kichik | 11px |
| `--theme-font-base` | O'rtacha | 15px |
| `--theme-font-xl` | Katta | 24px |

### Oraliqlar / Spacing (8pt grid)
| O'zgaruvchi | O'lcham |
|------------|---------|
| `--theme-space-1` | 4px |
| `--theme-space-2` | 8px |
| `--theme-space-4` | 16px |
| `--theme-space-8` | 32px |

### Burchak Radiuslari / Border Radius
| O'zgaruvchi | O'lcham |
|------------|---------|
| `--theme-radius-sm` | 6px |
| `--theme-radius-md` | 10px |
| `--theme-radius-lg` | 14px |
| `--theme-radius-xl` | 20px |

---

## 💡 Misollar / Examples

### Misol 1: Butun Loyihani Qizil Rangda
```css
/* theme-config.css */
:root {
  --theme-primary: #EF4444;           /* Qizil */
  --theme-primary-hover: #DC2626;     /* To'qroq qizil */
  --theme-secondary: #F87171;         /* Ochroq qizil */
}
```

### Misol 2: Katta Shriftlar
```css
/* theme-config.css */
:root {
  --theme-font-base: 1.125rem;        /* 18px o'rniga 15px */
  --theme-font-lg: 1.5rem;            /* 24px o'rniga 20px */
}
```

### Misol 3: Keng Oraliqlar
```css
/* theme-config.css */
:root {
  --theme-space-4: 1.5rem;            /* 24px o'rniga 16px */
  --theme-space-6: 2.25rem;           /* 36px o'rniga 24px */
}
```

### Misol 4: JavaScript Orqali O'zgartirish
```typescript
// App.tsx yoki boshqa komponent
import { useEffect } from 'react';
import { applyTheme } from './utils/themeManager';

function App() {
  useEffect(() => {
    // Tunda qora, kunduzgi payt oq
    const hour = new Date().getHours();
    if (hour >= 19 || hour < 7) {
      applyTheme('modern-dark');
    } else {
      applyTheme('professional-white');
    }
  }, []);
  
  return <div>...</div>;
}
```

---

## 🔧 Kengaytirilgan Sozlash / Advanced Configuration

### Yangi Mavzu Yaratish
```css
/* theme-presets.css ga qo'shing */
.theme-my-custom {
  --theme-primary: #YOUR_COLOR;
  --theme-bg-primary: #YOUR_BG;
  /* Va boshqalar... */
}
```

### Dinamik Rang Generatsiyasi
```typescript
import { adjustColor, hexToRgb } from './utils/themeManager';

// Rangni 20% ochroq qilish
const lighterColor = adjustColor('#3B82F6', 20);

// RGB ga o'zgartirish
const rgb = hexToRgb('#3B82F6');
console.log(rgb); // { r: 59, g: 130, b: 246 }
```

---

## 📱 Admin Panel Integratsiyasi / Admin Panel Integration

Tema sozlamalarini admin panelga qo'shish:

```tsx
// frontend/src/pages/admin/ThemeSettings.tsx
import { ThemeSwitcher } from '../../components/ThemeSwitcher';

export default function ThemeSettings() {
  return (
    <div>
      <h1>Dizayn Sozlamalari</h1>
      <ThemeSwitcher />
    </div>
  );
}
```

---

## ✅ Afzalliklar / Advantages

1. ✨ **Bitta Joydan Boshqarish** - Barcha ranglar bir faylda
2. 🚀 **Tezkor O'zgarish** - Bir o'zgaruvchini o'zgartirish butun loyihani o'zgartiradi
3. 🎨 **8 Ta Tayyor Mavzu** - Darhol ishlatishga tayyor
4. 🔄 **Avtomatik Saqlash** - Foydalanuvchi tanlovini eslab qoladi
5. 📱 **Responsive** - Barcha ekranlarda ishlaydi
6. ♿ **Accessible** - Yorug'lik kontrastini ta'minlaydi
7. 🛠️ **TypeScript Qo'llab-quvvati** - Type-safe
8. 💾 **LocalStorage** - Brauzer yopilgandan keyin ham saqlaydi

---

## 🎯 Tez Yordam / Quick Reference

**Rang o'zgartirish:**
→ `theme-config.css` > `--theme-primary`

**Mavzu tanlash:**
→ HTML ga `class="theme-ocean-blue"` qo'shing

**Shrift o'zgartirish:**
→ `theme-config.css` > `--theme-font-family`

**Soya o'zgartirish:**
→ `theme-config.css` > `--theme-shadow-md`

**Tema tiklash:**
```typescript
import { resetTheme } from './utils/themeManager';
resetTheme();
```

---

## 📞 Qo'shimcha Yordam / Additional Help

Agar qiyinchilik bo'lsa:
1. `theme-config.css` faylini ko'ring - barcha sozlamalar u yerda
2. `THEME_DOCUMENTATION.md` (shu fayl) ni o'qing
3. `theme-presets.css` da misollarga qarang

**Esda tuting:** Faqat `theme-config.css` faylini o'zgartirsangiz kifoya! 🎉
