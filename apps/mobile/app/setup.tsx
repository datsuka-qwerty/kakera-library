import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { setupApi, authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function SetupScreen() {
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!username.trim()) { Alert.alert(t("common.error"), t("setup.errorUsername")); return; }
    if (password.length < 8) { Alert.alert(t("common.error"), t("setup.errorPasswordLength")); return; }
    if (password !== confirm) { Alert.alert(t("common.error"), t("setup.errorPasswordMatch")); return; }

    setLoading(true);
    try {
      await setupApi.createAdmin({ username: username.trim(), password });
      const data = await authApi.login(username.trim(), password);
      setAuth(data.accessToken, data.refreshToken, data.user);
      router.replace("/(tabs)/");
    } catch {
      Alert.alert(t("common.error"), t("setup.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Kakera Library</Text>
        <Text style={s.subtitle}>{t("setup.title")}</Text>
        <Text style={s.description}>{t("setup.subtitle")}</Text>

        <Text style={s.label}>{t("profile.username")}</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" />

        <Text style={s.label}>{t("profile.passwordHint")}</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

        <Text style={s.label}>{t("profile.passwordConfirm")}</Text>
        <TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry />

        <Pressable style={[s.button, loading && s.buttonDisabled]} onPress={handleSetup} disabled={loading}>
          <Text style={s.buttonText}>{loading ? t("setup.creating") : t("setup.createBtn")}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 28, backgroundColor: "#F5F0E8" },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 8, color: "#374151" },
  description: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 32 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  button: { backgroundColor: "#111827", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
