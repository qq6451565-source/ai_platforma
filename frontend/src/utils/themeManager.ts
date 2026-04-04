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
  
  // Ant Design sinxronlash uchun event / Event for Ant Design sync
  window.dispatchEvent(new CustomEvent('theme-changed'));
}

/**
 * HEX rangni RGB kanal string ga aylantirish / Convert HEX to RGB channel string
 */
function hexToRgbString(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
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
  if (colors.primary) {
    root.style.setProperty('--accent', colors.primary);
    const rgb = hexToRgbString(colors.primary);
    if (rgb) root.style.setProperty('--accent-rgb', rgb);
  }
  if (colors.primaryHover) root.style.setProperty('--accent-hover', colors.primaryHover);
  if (colors.primaryActive) root.style.setProperty('--accent-active', colors.primaryActive);
  if (colors.secondary) {
    root.style.setProperty('--accent-2', colors.secondary);
    const rgb = hexToRgbString(colors.secondary);
    if (rgb) root.style.setProperty('--accent-2-rgb', rgb);
  }
  if (colors.tertiary) {
    root.style.setProperty('--accent-3', colors.tertiary);
    const rgb = hexToRgbString(colors.tertiary);
    if (rgb) root.style.setProperty('--accent-3-rgb', rgb);
  }
  
  if (colors.bgPrimary) root.style.setProperty('--color-background', colors.bgPrimary);
  if (colors.bgSecondary) root.style.setProperty('--bg-elevated-2', colors.bgSecondary);
  if (colors.bgTertiary) root.style.setProperty('--bg-elevated-3', colors.bgTertiary);
  if (colors.bgElevated) root.style.setProperty('--color-surface', colors.bgElevated);
  
  if (colors.borderLight) root.style.setProperty('--border-subtle', colors.borderLight);
  if (colors.borderDefault) root.style.setProperty('--color-border', colors.borderDefault);
  if (colors.borderStrong) root.style.setProperty('--border-strong', colors.borderStrong);
  
  if (colors.textPrimary) root.style.setProperty('--color-text-primary', colors.textPrimary);
  if (colors.textSecondary) root.style.setProperty('--color-text-secondary', colors.textSecondary);
  if (colors.textMuted) root.style.setProperty('--color-text-muted', colors.textMuted);
  if (colors.textDisabled) root.style.setProperty('--color-text-disabled', colors.textDisabled);
  
  if (colors.success) {
    root.style.setProperty('--color-success', colors.success);
    const rgb = hexToRgbString(colors.success);
    if (rgb) root.style.setProperty('--color-success-rgb', rgb);
  }
  if (colors.warning) {
    root.style.setProperty('--color-warning', colors.warning);
    const rgb = hexToRgbString(colors.warning);
    if (rgb) root.style.setProperty('--color-warning-rgb', rgb);
  }
  if (colors.error) {
    root.style.setProperty('--color-error', colors.error);
    const rgb = hexToRgbString(colors.error);
    if (rgb) root.style.setProperty('--color-error-rgb', rgb);
  }
  if (colors.info) {
    root.style.setProperty('--color-info', colors.info);
    const rgb = hexToRgbString(colors.info);
    if (rgb) root.style.setProperty('--color-info-rgb', rgb);
  }
  
  // LocalStorage ga saqlash / Save to localStorage
  localStorage.setItem('app-custom-theme', JSON.stringify(colors));
  
  // Ant Design sinxronlash uchun event / Event for Ant Design sync
  window.dispatchEvent(new CustomEvent('theme-changed'));
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
    '--accent', '--accent-hover', '--accent-active',
    '--accent-2', '--accent-3',
    '--accent-rgb', '--accent-2-rgb', '--accent-3-rgb',
    '--color-background', '--bg-elevated-2', '--bg-elevated-3', '--color-surface',
    '--border-subtle', '--color-border', '--border-strong',
    '--color-text-primary', '--color-text-secondary', '--color-text-muted', '--color-text-disabled',
    '--color-success', '--color-warning', '--color-error', '--color-info',
    '--color-success-rgb', '--color-warning-rgb', '--color-error-rgb', '--color-info-rgb'
  ];
  
  themeProps.forEach(prop => root.style.removeProperty(prop));
  
  // LocalStorage ni tozalash / Clear localStorage
  localStorage.removeItem('app-theme');
  localStorage.removeItem('app-custom-theme');
  
  // Ant Design sinxronlash uchun event / Event for Ant Design sync
  window.dispatchEvent(new CustomEvent('theme-changed'));
}

/**
 * CSS o'zgaruvchilardan Ant Design tokenlarini olish / Get Ant Design tokens from CSS variables
 */
export function getAntdThemeTokens(): { colorPrimary: string; colorBgContainer: string; siderBg: string; headerBg: string; borderRadius: number } {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string, fallback: string) => style.getPropertyValue(prop).trim() || fallback;
  return {
    colorPrimary: get('--accent', '#3B82F6'),
    colorBgContainer: get('--color-surface', '#ffffff'),
    siderBg: get('--color-surface', '#ffffff'),
    headerBg: get('--color-surface', '#ffffff'),
    borderRadius: parseInt(get('--radius-base', '8'), 10) || 8,
  };
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
