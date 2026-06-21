import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "../store/authStore";

export default function Index() {
  const { accessToken } = useAuthStore();
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0E8", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return <Redirect href={accessToken ? "/(tabs)/" : "/login"} />;
}
