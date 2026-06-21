import { useDarkModeStore } from "../store/darkModeStore";

export const LIGHT = {
  bg: "#F5F0E8",
  card: "#FFFFFF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  text: "#111827",
  textSub: "#374151",
  textMuted: "#6B7280",
  placeholder: "#9CA3AF",
  tabBar: "#F5F0E8",
  tabBorder: "#DDD8D0",
  accent: "#111827",
  accentFg: "#FFFFFF",
  destructive: "#B91C1C",
  inputBg: "#FFFFFF",
  iconBtn: "#4B5563",
  switchTrack: "#111827",
  deleteText: "#B91C1C",
};

export const DARK = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  borderLight: "#334155",
  text: "#F1F5F9",
  textSub: "#CBD5E1",
  textMuted: "#94A3B8",
  placeholder: "#64748B",
  tabBar: "#1E293B",
  tabBorder: "#334155",
  accent: "#6366F1",
  accentFg: "#FFFFFF",
  destructive: "#EF4444",
  inputBg: "#1E293B",
  iconBtn: "#475569",
  switchTrack: "#6366F1",
  deleteText: "#EF4444",
};

export type Theme = typeof LIGHT;

export function useTheme(): Theme {
  const isDark = useDarkModeStore((s) => s.isDark);
  return isDark ? DARK : LIGHT;
}

export function useAccent(): string {
  const isDark = useDarkModeStore((s) => s.isDark);
  return isDark ? DARK.accent : LIGHT.accent;
}
