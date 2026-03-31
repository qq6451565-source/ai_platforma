import axios from "axios";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "../utils/token";

// VITE_API_BASE is primary; keep backward compatibility with VITE_API_BASE_URL.
const baseURL =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({ baseURL });

// Separate instance for token refresh — avoids interceptor loop
const refreshApi = axios.create({ baseURL });

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthEndpoint = url.includes("/api/token");
    const isMeEndpoint = url.includes("/api/accounts/me");

    // Log API errors for debugging
    console.error("[API Error]", {
      method: error.config?.method?.toUpperCase(),
      url,
      status,
      message: error.response?.data?.detail || error.message,
    });

    const shouldRefresh =
      !isAuthEndpoint &&
      status === 401 &&
      !error.config._retry;

    if (shouldRefresh) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            error.config.headers.Authorization = `Bearer ${newToken}`;
            error.config._retry = true;
            resolve(api(error.config));
          });
        });
      }

      error.config._retry = true;
      isRefreshing = true;

      try {
        const res = await refreshApi.post("/api/token/refresh/", { refresh: refreshToken });
        const newAccess: string = res.data.access;
        const newRefresh: string | undefined = res.data.refresh;
        saveTokens(newAccess, newRefresh);
        processQueue(newAccess);
        error.config.headers.Authorization = `Bearer ${newAccess}`;
        return api(error.config);
      } catch {
        clearTokens();
        refreshQueue = [];
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (!isAuthEndpoint && (status === 403 && isMeEndpoint)) {
      console.warn("[Auth] Forbidden on /me, redirecting to login");
      clearTokens();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
