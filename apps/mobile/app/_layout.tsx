import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { router, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { useDarkModeStore } from "../store/darkModeStore";
import "../lib/i18n";
import "../store/languageStore";

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
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthGuard />
      <Stack>
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
