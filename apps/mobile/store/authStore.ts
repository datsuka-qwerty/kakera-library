import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  serverUrl: string;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  setServerUrl: (url: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      serverUrl: "",
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
      setServerUrl: (url) => set({ serverUrl: url }),
    }),
    {
      name: "kakera-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
