import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { router, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";

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
  return (
    <>
      <StatusBar style="auto" />
      <AuthGuard />
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="barcode" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
    </>
  );
}
