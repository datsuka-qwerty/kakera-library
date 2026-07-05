import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Shared refresh promise: prevents parallel 401 responses from each triggering
// their own refresh (token rotation means the second would fail and log out).
let refreshing: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const { refreshToken } = useAuthStore.getState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (refreshToken && !(err.config as any)._isRetry) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err.config as any)._isRetry = true;
        try {
          if (!refreshing) {
            refreshing = axios
              .post("/api/v1/auth/refresh", { refreshToken })
              .then((r) => {
                useAuthStore
                  .getState()
                  .setAuth(r.data.accessToken, r.data.refreshToken, useAuthStore.getState().user!);
                return r.data.accessToken as string;
              })
              .finally(() => {
                refreshing = null;
              });
          }
          const newToken = await refreshing;
          err.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(err.config);
        } catch {
          refreshing = null;
        }
      }
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
