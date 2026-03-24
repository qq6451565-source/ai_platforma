import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import "./index.css";
import "./i18n";
import { loadSavedTheme } from "./utils/themeManager";
import { validateEnvironment } from "./utils/envValidation";

// Environment validation
try {
  validateEnvironment();
} catch (error) {
  console.error("Environment validation failed:", error);
}

// Saqlangan temani yuklash / Load saved theme
loadSavedTheme();

const queryClient = new QueryClient();

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 8,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppWithProviders />
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>
);
