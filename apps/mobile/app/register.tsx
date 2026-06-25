import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function RegisterScreen() {
  const { setAuth, serverUrl } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert("エラー", "すべての項目を入力してください");
      return;
    }
    if (password !== confirm) {
      Alert.alert("エラー", "パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      Alert.alert("エラー", "パスワードは8文字以上で入力してください");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({ username: username.trim(), email: email.trim(), password });
      setAuth(data.accessToken, data.refreshToken, data.user);
      router.replace("/(tabs)/");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) Alert.alert("エラー", "このユーザー名またはメールアドレスはすでに使われています");
      else if (status === 403) Alert.alert("エラー", "現在、新規登録は受け付けていません");
      else Alert.alert("エラー", "登録に失敗しました。再度お試しください");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Kakera Library</Text>
        <Text style={s.subtitle}>新規アカウント登録</Text>
        <Text style={s.serverUrl}>{serverUrl}</Text>

        <Text style={s.label}>ユーザー名</Text>
        <TextInput
          style={s.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
        />
        <Text style={s.label}>メールアドレス</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Text style={s.label}>パスワード（8文字以上）</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Text style={s.label}>パスワード（確認）</Text>
        <TextInput
          style={s.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
        />

        <Pressable style={[s.button, loading && s.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={s.buttonText}>{loading ? "登録中..." : "アカウントを作成"}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>ログインに戻る</Text>
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
