import { apiClient } from "../apiClient";
import type { LoginRequest, LoginResponse } from "@kakera/shared";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>("/auth/login", data).then((r) => r.data),
  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken }).then((r) => r.data),
  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", { refreshToken }),
  setupTOTP: () =>
    apiClient.post<{ secret: string; qrCodeUrl: string }>("/auth/totp/setup").then((r) => r.data),
  verifyTOTP: (code: string) =>
    apiClient.post("/auth/totp/verify", { code }),
  disableTOTP: () =>
    apiClient.delete("/auth/totp"),
};
