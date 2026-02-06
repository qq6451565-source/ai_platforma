import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import './LanguageSwitcher.css';

const languages = [
  { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const menuItems: MenuProps['items'] = languages.map((lang) => ({
    key: lang.code,
    label: (
      <div className="language-option" onClick={() => handleLanguageChange(lang.code)}>
        <span className="language-flag">{lang.flag}</span>
        <span className="language-name">{lang.name}</span>
      </div>
    ),
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <div className="language-switcher">
        <span className="current-flag">{currentLang.flag}</span>
        <span className="current-code">{currentLang.code.toUpperCase()}</span>
      </div>
    </Dropdown>
  );
};
