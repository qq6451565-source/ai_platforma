import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import "./index.css";
import "./i18n";
import { loadSavedTheme, getAntdThemeTokens } from "./utils/themeManager";
import "./utils/envValidation";

// Saqlangan temani yuklash / Load saved theme
loadSavedTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const AppWithProviders = () => (
  <BrowserRouter>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </BrowserRouter>
);

/**
 * Ant Design ConfigProvider ni tema o'zgarishlariga reaktiv qiluvchi komponent
 * Makes Ant Design ConfigProvider reactive to theme changes
 */
const ThemedApp: React.FC = () => {
  const [tokens, setTokens] = useState(getAntdThemeTokens);

  const syncTokens = useCallback(() => {
    // requestAnimationFrame — CSS o'zgaruvchilari yangilanguncha kutish
    requestAnimationFrame(() => setTokens(getAntdThemeTokens()));
  }, []);

  useEffect(() => {
    window.addEventListener('theme-changed', syncTokens);
    return () => window.removeEventListener('theme-changed', syncTokens);
  }, [syncTokens]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: tokens.colorPrimary,
          colorBgContainer: tokens.colorBgContainer,
          borderRadius: tokens.borderRadius,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Layout: {
            siderBg: tokens.siderBg,
            headerBg: tokens.headerBg,
          },
          Menu: {
            itemBg: "transparent",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppWithProviders />
      </QueryClientProvider>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
