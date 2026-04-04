import { useTranslation } from "react-i18next";
import { Button } from "antd";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <Button
        type={i18n.language === 'uz' ? 'primary' : 'default'}
        onClick={() => changeLanguage('uz')}
      >
        UZ
      </Button>
      <Button
        type={i18n.language === 'en' ? 'primary' : 'default'}
        onClick={() => changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        type={i18n.language === 'ru' ? 'primary' : 'default'}
        onClick={() => changeLanguage('ru')}
      >
        RU
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
