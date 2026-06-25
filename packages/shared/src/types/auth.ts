export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: string;
    avatarUrl?: string | null;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface TOTPSetupResponse {
  secret: string;
  qrCodeUrl: string;
}
