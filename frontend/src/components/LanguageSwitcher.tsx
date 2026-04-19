import { useTranslation } from "react-i18next";
import { Button, Grid, Select } from "antd";

const LANGS = ['uz', 'en', 'ru'] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (isMobile) {
    return (
      <Select
        size="small"
        value={LANGS.includes(i18n.language as typeof LANGS[number]) ? i18n.language : 'uz'}
        onChange={changeLanguage}
        style={{ width: 64 }}
        options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
        popupMatchSelectWidth={false}
      />
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {LANGS.map((lng) => (
        <Button
          key={lng}
          size="small"
          type={i18n.language === lng ? 'primary' : 'default'}
          onClick={() => changeLanguage(lng)}
          style={{ minWidth: 34, padding: '0 6px' }}
        >
          {lng.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
