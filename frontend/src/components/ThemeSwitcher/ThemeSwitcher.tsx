/**
 * ═══════════════════════════════════════════════════════════════
 * TEMA ALMASHTIRUVCHI KOMPONENT / THEME SWITCHER COMPONENT
 * Foydalanuvchi uchun tema o'zgartirish interfeysi
 * Theme switching interface for users
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
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
  const [currentTheme, setCurrentTheme] = useState<string>(getCurrentTheme());
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');

  useEffect(() => {
    // Sahifa yuklanganda saqlangan temani yuklash / Load saved theme on page load
    setCurrentTheme(getCurrentTheme());
  }, []);

  const handleThemeChange = (value: ThemePreset) => {
    applyTheme(value);
    setCurrentTheme(value);
    message.success(`Tema o'zgartirildi: ${availableThemes.find(t => t.value === value)?.label}`);
  };

  const handleColorChange = (color: any) => {
    const hexColor = color.toHexString();
    setPrimaryColor(hexColor);
    applyCustomTheme({ primary: hexColor });
    message.success('Maxsus rang qo\'llandi');
  };

  const handleReset = () => {
    resetTheme();
    setCurrentTheme('default');
    setPrimaryColor('#3B82F6');
    message.success('Tema tiklandi');
  };

  return (
    <Card className="theme-switcher-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>
            <BgColorsOutlined /> Dizayn Sozlamalari
          </Title>
          <Text type="secondary">
            Ilovaning ranglarini va dizaynini o'zgartiring
          </Text>
        </div>

        <div>
          <Text strong>Tayyor Mavzular:</Text>
          <Select
            value={currentTheme}
            onChange={handleThemeChange}
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Tema tanlang"
            options={availableThemes.map(theme => ({
              value: theme.value,
              label: (
                <div>
                  <div>{theme.label}</div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {theme.description}
                  </Text>
                </div>
              )
            }))}
          />
        </div>

        <div>
          <Text strong>Maxsus Rang:</Text>
          <div style={{ marginTop: 8 }}>
            <ColorPicker
              value={primaryColor}
              onChange={handleColorChange}
              showText
              size="large"
              style={{ width: '100%' }}
            />
          </div>
          <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
            Asosiy rangni tanlang va ilova avtomatik mos ranglarni yaratadi
          </Text>
        </div>

        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleReset}
          block
        >
          Standart Holatga Qaytarish
        </Button>
      </Space>
    </Card>
  );
};

export default ThemeSwitcher;
