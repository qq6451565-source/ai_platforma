import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const APP_NAME = "HEMIS LMS";

export function usePageTitle(titleKey?: string) {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} — ${APP_NAME}` : APP_NAME;
    return () => { document.title = APP_NAME; };
  }, [titleKey, t]);
}
