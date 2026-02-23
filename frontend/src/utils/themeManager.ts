/**
 * ═══════════════════════════════════════════════════════════════
 * TEMA BOSHQARUVCHI / THEME MANAGER
 * Dizaynni oson o'zgartirish uchun yordamchi funksiyalar
 * Helper functions to easily change design
 * ═══════════════════════════════════════════════════════════════
 */

export type ThemePreset = 
  | 'professional-white'
  | 'modern-dark'
  | 'ocean-blue'
  | 'sunset-orange'
  | 'forest-green'
  | 'royal-purple'
  | 'rose-pink'
  | 'minimal-gray';

export type CustomThemeColors = {
  primary?: string;
  primaryHover?: string;
  primaryActive?: string;
  secondary?: string;
  tertiary?: string;
  
  bgPrimary?: string;
  bgSecondary?: string;
  bgTertiary?: string;
  bgElevated?: string;
  
  borderLight?: string;
  borderDefault?: string;
  borderStrong?: string;
  
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  textDisabled?: string;
  
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
};

/**
 * Tayyor mavzuni qo'llash / Apply preset theme
 * 
 * @example
 * applyTheme('ocean-blue');
 * applyTheme('forest-green');
 */
export function applyTheme(preset: ThemePreset): void {
  const html = document.documentElement;
  
  // Barcha tema klasslarini olib tashlash / Remove all theme classes
  html.className = html.className
    .split(' ')
    .filter(c => !c.startsWith('theme-'))
    .join(' ');
  
  // Yangi tema klassini qo'shish / Add new theme class
  html.classList.add(`theme-${preset}`);
  
  // LocalStorage ga saqlash / Save to localStorage
  localStorage.setItem('app-theme', preset);
}

/**
 * Maxsus ranglar bilan tema yaratish / Create theme with custom colors
 * 
 * @example
 * applyCustomTheme({
 *   primary: '#FF5733',
 *   bgPrimary: '#FFFFFF',
 *   textPrimary: '#000000'
 * });
 */
export function applyCustomTheme(colors: CustomThemeColors): void {
  const root = document.documentElement;
  
  // Ranglarni CSS o'zgaruvchilariga o'rnatish / Set colors to CSS variables
  if (colors.primary) root.style.setProperty('--theme-primary', colors.primary);
  if (colors.primaryHover) root.style.setProperty('--theme-primary-hover', colors.primaryHover);
  if (colors.primaryActive) root.style.setProperty('--theme-primary-active', colors.primaryActive);
  if (colors.secondary) root.style.setProperty('--theme-secondary', colors.secondary);
  if (colors.tertiary) root.style.setProperty('--theme-tertiary', colors.tertiary);
  
  if (colors.bgPrimary) root.style.setProperty('--theme-bg-primary', colors.bgPrimary);
  if (colors.bgSecondary) root.style.setProperty('--theme-bg-secondary', colors.bgSecondary);
  if (colors.bgTertiary) root.style.setProperty('--theme-bg-tertiary', colors.bgTertiary);
  if (colors.bgElevated) root.style.setProperty('--theme-bg-elevated', colors.bgElevated);
  
  if (colors.borderLight) root.style.setProperty('--theme-border-light', colors.borderLight);
  if (colors.borderDefault) root.style.setProperty('--theme-border-default', colors.borderDefault);
  if (colors.borderStrong) root.style.setProperty('--theme-border-strong', colors.borderStrong);
  
  if (colors.textPrimary) root.style.setProperty('--theme-text-primary', colors.textPrimary);
  if (colors.textSecondary) root.style.setProperty('--theme-text-secondary', colors.textSecondary);
  if (colors.textMuted) root.style.setProperty('--theme-text-muted', colors.textMuted);
  if (colors.textDisabled) root.style.setProperty('--theme-text-disabled', colors.textDisabled);
  
  if (colors.success) root.style.setProperty('--theme-success', colors.success);
  if (colors.warning) root.style.setProperty('--theme-warning', colors.warning);
  if (colors.error) root.style.setProperty('--theme-error', colors.error);
  if (colors.info) root.style.setProperty('--theme-info', colors.info);
  
  // LocalStorage ga saqlash / Save to localStorage
  localStorage.setItem('app-custom-theme', JSON.stringify(colors));
}

/**
 * Saqlangan temani yuklash / Load saved theme
 * 
 * @example
 * loadSavedTheme();
 */
export function loadSavedTheme(): void {
  // Tayyor mavzuni yuklash / Load preset theme
  const savedTheme = localStorage.getItem('app-theme') as ThemePreset | null;
  if (savedTheme) {
    applyTheme(savedTheme);
  }
  
  // Maxsus ranglarni yuklash / Load custom colors
  const customTheme = localStorage.getItem('app-custom-theme');
  if (customTheme) {
    try {
      const colors = JSON.parse(customTheme) as CustomThemeColors;
      applyCustomTheme(colors);
    } catch (error) {
      console.error('Error loading custom theme:', error);
    }
  }
}

/**
 * Temani tiklash / Reset theme to default
 * 
 * @example
 * resetTheme();
 */
export function resetTheme(): void {
  const html = document.documentElement;
  
  // Barcha tema klasslarini olib tashlash / Remove all theme classes
  html.className = html.className
    .split(' ')
    .filter(c => !c.startsWith('theme-'))
    .join(' ');
  
  // Inline stillarni tozalash / Clear inline styles
  const root = document.documentElement;
  const themeProps = [
    '--theme-primary', '--theme-primary-hover', '--theme-primary-active',
    '--theme-secondary', '--theme-tertiary',
    '--theme-bg-primary', '--theme-bg-secondary', '--theme-bg-tertiary', '--theme-bg-elevated',
    '--theme-border-light', '--theme-border-default', '--theme-border-strong',
    '--theme-text-primary', '--theme-text-secondary', '--theme-text-muted', '--theme-text-disabled',
    '--theme-success', '--theme-warning', '--theme-error', '--theme-info'
  ];
  
  themeProps.forEach(prop => root.style.removeProperty(prop));
  
  // LocalStorage ni tozalash / Clear localStorage
  localStorage.removeItem('app-theme');
  localStorage.removeItem('app-custom-theme');
}

/**
 * Joriy temani olish / Get current theme
 * 
 * @example
 * const theme = getCurrentTheme();
 */
export function getCurrentTheme(): ThemePreset | 'default' | 'custom' {
  const savedTheme = localStorage.getItem('app-theme');
  const customTheme = localStorage.getItem('app-custom-theme');
  
  if (savedTheme) return savedTheme as ThemePreset;
  if (customTheme) return 'custom';
  return 'default';
}

/**
 * Barcha mavjud mavzular ro'yxati / List of all available themes
 */
export const availableThemes: { value: ThemePreset; label: string; description: string }[] = [
  { 
    value: 'professional-white', 
    label: 'Professional White',
    description: 'Toza professional oq dizayn'
  },
  { 
    value: 'modern-dark', 
    label: 'Modern Dark',
    description: 'Zamonaviy qora dizayn'
  },
  { 
    value: 'ocean-blue', 
    label: 'Ocean Blue',
    description: 'Okean ko\'k dizayn'
  },
  { 
    value: 'sunset-orange', 
    label: 'Sunset Orange',
    description: 'Quyosh botishi to\'q sariq'
  },
  { 
    value: 'forest-green', 
    label: 'Forest Green',
    description: 'O\'rmon yashil dizayn'
  },
  { 
    value: 'royal-purple', 
    label: 'Royal Purple',
    description: 'Qirollik binafsha dizayn'
  },
  { 
    value: 'rose-pink', 
    label: 'Rose Pink',
    description: 'Atirgul pushti dizayn'
  },
  { 
    value: 'minimal-gray', 
    label: 'Minimal Gray',
    description: 'Minimal kulrang dizayn'
  }
];

/**
 * Rang mos kelishini tekshirish / Check if color is valid
 */
export function isValidColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * HEX rangni RGB ga o'zgartirish / Convert HEX to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Rangni ochroq yoki to'qroq qilish / Lighten or darken color
 */
export function adjustColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * (percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };
  
  const r = adjust(rgb.r);
  const g = adjust(rgb.g);
  const b = adjust(rgb.b);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
