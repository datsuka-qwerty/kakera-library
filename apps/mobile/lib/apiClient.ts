import axios from "axios";
import { useAuthStore } from "../store/authStore";

const client = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Shared refresh promise: prevents parallel 401 responses from each triggering
// their own refresh (token rotation means the second would fail and log out).
let refreshing: Promise<string> | null = null;

client.interceptors.request.use((config) => {
  const { serverUrl, accessToken } = useAuthStore.getState();
  config.baseURL = `${serverUrl}/api/v1`;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status !== 401) return Promise.reject(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err.config as any)._isRetry) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(err);
    }

    const { refreshToken, serverUrl } = useAuthStore.getState();
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(err);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err.config as any)._isRetry = true;
    try {
      if (!refreshing) {
        refreshing = axios
          .post(`${serverUrl}/api/v1/auth/refresh`, { refreshToken })
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
      return client(err.config);
    } catch {
      refreshing = null;
      useAuthStore.getState().clearAuth();
      return Promise.reject(err);
    }
  }
);

export const api = {
  get: <T>(path: string, params?: object) =>
    client.get<T>(path, { params }).then((r) => r.data),
  post: <T>(path: string, data?: object) =>
    client.post<T>(path, data).then((r) => r.data),
  put: <T>(path: string, data?: object) =>
    client.put<T>(path, data).then((r) => r.data),
  delete: (path: string) => client.delete(path),
};
