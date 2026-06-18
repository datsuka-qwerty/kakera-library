import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const createApiClient = () => {
  const { serverUrl, accessToken } = useAuthStore.getState();

  const client = axios.create({
    baseURL: `${serverUrl}/api/v1`,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status === 401) {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          try {
            const res = await axios.post(
              `${useAuthStore.getState().serverUrl}/api/v1/auth/refresh`,
              { refreshToken }
            );
            useAuthStore
              .getState()
              .setAuth(
                res.data.accessToken,
                res.data.refreshToken,
                useAuthStore.getState().user!
              );
            err.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return axios(err.config);
          } catch {
            useAuthStore.getState().clearAuth();
          }
        }
      }
      return Promise.reject(err);
    }
  );

  return client;
};

export const api = {
  get: <T>(path: string, params?: object) =>
    createApiClient()
      .get<T>(path, { params })
      .then((r) => r.data),
  post: <T>(path: string, data?: object) =>
    createApiClient()
      .post<T>(path, data)
      .then((r) => r.data),
  put: <T>(path: string, data?: object) =>
    createApiClient()
      .put<T>(path, data)
      .then((r) => r.data),
  delete: (path: string) => createApiClient().delete(path),
};
