/**
 * ═══════════════════════════════════════════════════════════════
 * TEMA ALMASHTIRUVCHI KOMPONENT / THEME SWITCHER COMPONENT
 * Foydalanuvchi uchun tema o'zgartirish interfeysi
 * Theme switching interface for users
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Button, ColorPicker, Space, Typography, Card, message } from 'antd';
import { BgColorsOutlined, ReloadOutlined } from '@ant-design/icons';
import { 
  applyTheme, 
  applyCustomTheme, 
  resetTheme, 
  getCurrentTheme, 
  availableThemes,
  type ThemePreset 
} from '../../utils/themeManager';
import './ThemeSwitcher.css';

const { Title, Text } = Typography;

export const ThemeSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState<ThemePreset | 'default' | 'custom'>(getCurrentTheme());
  const [primaryColor, setPrimaryColor] = useState(() => 
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3B82F6'
  );

  useEffect(() => {
    // Sahifa yuklanganda saqlangan temani yuklash / Load saved theme on page load
    setCurrentTheme(getCurrentTheme());
  }, []);

  const handleThemeChange = (value: ThemePreset) => {
    applyTheme(value);
    setCurrentTheme(value);
    message.success(t('themeSwitcher.themeChanged', { name: availableThemes.find(th => th.value === value)?.label }));
  };

  const handleColorChange = (color: any) => {
    const hexColor = color.toHexString();
    setPrimaryColor(hexColor);
    applyCustomTheme({ primary: hexColor });
    message.success(t('themeSwitcher.customColorApplied'));
  };

  const handleReset = () => {
    resetTheme();
    setCurrentTheme('default');
    setPrimaryColor(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3B82F6');
    message.success(t('themeSwitcher.themeReset'));
  };

  return (
    <Card className="theme-switcher-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>
            <BgColorsOutlined /> {t('themeSwitcher.designSettings')}
          </Title>
          <Text type="secondary">
            {t('themeSwitcher.designDescription')}
          </Text>
        </div>

        <div>
          <Text strong>{t('themeSwitcher.readyThemes')}</Text>
          <Select
            value={currentTheme === 'default' || currentTheme === 'custom' ? undefined : currentTheme}
            onChange={handleThemeChange}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
            placeholder={t('themeSwitcher.selectTheme')}
            options={availableThemes.map(theme => ({
              value: theme.value,
              label: (
                <div>
                  <div>{theme.label}</div>
                  <Text type="secondary" style={{ fontSize: 'var(--font-size-tiny)' }}>
                    {theme.description}
                  </Text>
                </div>
              )
            }))}
          />
        </div>

        <div>
          <Text strong>{t('themeSwitcher.customColor')}</Text>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <ColorPicker
              value={primaryColor}
              onChange={handleColorChange}
              showText
              size="large"
              style={{ width: '100%' }}
            />
          </div>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-tiny)', marginTop: 'var(--space-1)', display: 'block' }}>
            {t('themeSwitcher.customColorDescription')}
          </Text>
        </div>

        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleReset}
          block
        >
          {t('themeSwitcher.resetToDefault')}
        </Button>
      </Space>
    </Card>
  );
};

export default ThemeSwitcher;
