import axios from "axios";
import { getAccessToken, clearTokens } from "../utils/token";

// VITE_API_BASE is primary; keep backward compatibility with VITE_API_BASE_URL.
const baseURL =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const requestAuth = error.config?.headers?.Authorization;
    const currentAuth = `Bearer ${getAccessToken() || ""}`;
    const isCurrentToken = requestAuth && requestAuth === currentAuth;
    const isMeEndpoint = url.includes("/api/accounts/me");
    const isAuthEndpoint = url.includes("/api/token");

    // Log API errors for debugging
    console.error("[API Error]", {
      method: error.config?.method?.toUpperCase(),
      url,
      status,
      message: error.response?.data?.detail || error.message,
    });

    if (!isAuthEndpoint && isCurrentToken) {
      if (status === 401 || (status === 403 && isMeEndpoint)) {
        console.warn("[Auth] Token expired or unauthorized, redirecting to login");
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
