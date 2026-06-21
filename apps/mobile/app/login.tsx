import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { authApi, setupApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function LoginScreen() {
  const { setAuth, setServerUrl, serverUrl } = useAuthStore();
  const [url, setUrl] = useState(serverUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!url.trim()) { Alert.alert("エラー", "サーバーURLを入力してください"); return; }
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
        Alert.alert("ログイン失敗", "ユーザー名またはパスワードが正しくありません");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Kakera Library</Text>

        <Text style={s.label}>サーバーURL</Text>
        <TextInput
          style={s.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.x:3000"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={s.label}>ユーザー名</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={s.label}>パスワード</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
        {needTotp && (
          <>
            <Text style={s.label}>認証コード（Google Authenticator）</Text>
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
          <Text style={s.buttonText}>{loading ? "ログイン中..." : "ログイン"}</Text>
        </Pressable>
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
});
