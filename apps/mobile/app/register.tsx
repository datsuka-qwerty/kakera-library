import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { setAuth, serverUrl } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !password) {
      Alert.alert(t("common.error"), t("register.errorRequired"));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t("common.error"), t("register.errorPasswordMatch"));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t("common.error"), t("register.errorPasswordLength"));
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({ username: username.trim(), password });
      setAuth(data.accessToken, data.refreshToken, data.user);
      router.replace("/(tabs)/");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) Alert.alert(t("common.error"), t("register.errorUserExists"));
      else if (status === 403) Alert.alert(t("common.error"), t("register.errorDisabled"));
      else Alert.alert(t("common.error"), t("register.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Kakera Library</Text>
        <Text style={s.subtitle}>{t("register.title")}</Text>
        <Text style={s.serverUrl}>{serverUrl}</Text>

        <Text style={s.label}>{t("profile.username")}</Text>
        <TextInput
          style={s.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
        />
        <Text style={s.label}>{t("profile.passwordHint")}</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Text style={s.label}>{t("profile.passwordConfirm")}</Text>
        <TextInput
          style={s.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
        />

        <Pressable style={[s.button, loading && s.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={s.buttonText}>{loading ? t("register.creating") : t("register.createBtn")}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>{t("register.backToLogin")}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 28, backgroundColor: "#F5F0E8" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 4 },
  serverUrl: { fontSize: 11, color: "#9CA3AF", textAlign: "center", marginBottom: 28 },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  button: { backgroundColor: "#111827", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  backLink: { marginTop: 16, alignItems: "center" },
  backLinkText: { fontSize: 13, color: "#2563EB" },
});
