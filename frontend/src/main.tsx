import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App";
import "@livekit/components-styles";
import "./index.css";
import "./i18n";

const queryClient = new QueryClient();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
        <BrowserRouter>
          <GoogleOAuthProvider clientId={googleClientId}>
            <App />
          </GoogleOAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>
);
