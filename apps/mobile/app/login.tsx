import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { authApi, setupApi, serverSettingsApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { setAuth, setServerUrl, serverUrl } = useAuthStore();
  const [url, setUrl] = useState(serverUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    if (url.trim()) {
      serverSettingsApi.get().then((d) => setRegistrationEnabled(d.registrationEnabled)).catch(() => {});
    }
  }, [url]);

  const handleLogin = async () => {
    if (!url.trim()) { Alert.alert(t("common.error"), t("login.errorServerUrl")); return; }
    setLoading(true);
    setServerUrl(url.trim().replace(/\/$/, ""));
    try {
      const { needsSetup } = await setupApi.getStatus();
      if (needsSetup) {
        router.replace("/setup");
        return;
      }
      const data = await authApi.login(username, password, needTotp ? totpCode : undefined);
      setAuth(data.accessToken, data.refreshToken, data.user);
      router.replace("/(tabs)/");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 428) {
        setNeedTotp(true);
      } else {
        Alert.alert(t("login.loginFailed"), t("login.loginFailedMsg"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Kakera Library</Text>

        <Text style={s.label}>{t("login.serverUrl")}</Text>
        <TextInput
          style={s.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.x:3000"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={s.label}>{t("login.username")}</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={s.label}>{t("login.password")}</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
        {needTotp && (
          <>
            <Text style={s.label}>{t("login.totpCode")}</Text>
            <TextInput
              style={s.input}
              value={totpCode}
              onChangeText={setTotpCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
          </>
        )}

        <Pressable style={[s.button, loading && s.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={s.buttonText}>{loading ? t("login.loggingIn") : t("login.loginBtn")}</Text>
        </Pressable>

        {registrationEnabled && (
          <Pressable onPress={() => router.push("/register" as never)} style={s.registerLink}>
            <Text style={s.registerLinkText}>{t("login.noAccount")} </Text>
            <Text style={[s.registerLinkText, s.registerLinkBold]}>{t("login.registerLink")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 28, backgroundColor: "#F5F0E8" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 36, textAlign: "center" },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  button: { backgroundColor: "#111827", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 6 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  registerLink: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  registerLinkText: { fontSize: 13, color: "#6B7280" },
  registerLinkBold: { color: "#2563EB", fontWeight: "600" },
});
