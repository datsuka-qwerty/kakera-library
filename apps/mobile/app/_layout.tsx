import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { router, useSegments } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useAuthStore } from "../store/authStore";
import { useDarkModeStore } from "../store/darkModeStore";

const LIGHT_BG = "#F5F0E8";
const DARK_BG = "#111827";

function AuthGuard() {
  const { accessToken } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    const inAuth = segments[0] === "(tabs)";
    if (!accessToken && inAuth) {
      router.replace("/login");
    } else if (accessToken && segments[0] === "login") {
      router.replace("/(tabs)/");
    }
  }, [accessToken, segments]);

  return null;
}

export default function RootLayout() {
  const isDark = useDarkModeStore((s) => s.isDark);
  const bg = isDark ? DARK_BG : LIGHT_BG;

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(bg);
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
  }, [isDark, bg]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={bg} />
      <AuthGuard />
      <Stack screenOptions={{ contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="barcode" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="barcode-batch" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
    </>
  );
}
