import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
} from "react-native";
import { router } from "expo-router";
import { X, LogOut } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/apiClient";
import { mediaTypesApi } from "../lib/api";

interface SharingConfig {
  dashboardShares: string[];
  ratingShares: { toUserId: string; toUsername: string; enabled: boolean }[];
}

export default function SettingsScreen() {
  const { user, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<"profile" | "sharing" | "mediaTypes">("profile");

  const logout = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => { clearAuth(); router.replace("/login"); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0E8" }}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}><X size={22} color="#374151" /></Pressable>
        <Text style={s.headerTitle}>設定</Text>
        <Pressable onPress={logout}><LogOut size={22} color="#B91C1C" /></Pressable>
      </View>

      <View style={s.tabs}>
        {(["profile", "sharing", "mediaTypes"] as const).map((t) => (
          <Pressable key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "profile" ? "プロフィール" : t === "sharing" ? "共有" : "メディア種別"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "sharing" && <SharingTab />}
      {tab === "mediaTypes" && <MediaTypesTab />}
    </View>
  );
}

function ProfileTab({ user }: { user: { username: string; email: string } | null }) {
  const { setAuth, accessToken, refreshToken } = useAuthStore();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ id: string; username: string; email: string; role: string }>("/users/me", {
        username: username.trim(),
        email: email.trim(),
        password: password || undefined,
      });
      setAuth(accessToken!, refreshToken!, res);
      Alert.alert("保存しました");
      setPassword("");
    } catch {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={f.label}>ユーザー名</Text>
      <TextInput style={f.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
      <Text style={f.label}>メールアドレス</Text>
      <TextInput style={f.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Text style={f.label}>新しいパスワード（変更する場合のみ）</Text>
      <TextInput style={f.input} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={[f.btn, saving && f.btnDisabled]} onPress={save} disabled={saving}>
        <Text style={f.btnText}>{saving ? "保存中..." : "保存"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SharingTab() {
  const [config, setConfig] = useState<SharingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, rating] = await Promise.all([
        api.get<{ viewers: { id: string; username: string }[] }>("/sharing/dashboard"),
        api.get<{ shares: { toUserId: string; toUsername: string; enabled: boolean }[] }>("/sharing/ratings"),
      ]);
      setConfig({ dashboardShares: dash.viewers.map((v) => v.id), ratingShares: rating.shares });
    } catch {
      Alert.alert("エラー", "共有設定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleRating = async (toUserId: string, enabled: boolean) => {
    try {
      await api.put(`/sharing/ratings/${toUserId}`, { enabled });
      setConfig((prev) => prev ? {
        ...prev,
        ratingShares: prev.ratingShares.map((r) => r.toUserId === toUserId ? { ...r, enabled } : r),
      } : null);
    } catch {
      Alert.alert("エラー", "更新に失敗しました");
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={f.section}>評価の共有</Text>
      <Text style={f.description}>ONにすると、相手ユーザーはあなたの評価を閲覧できます（一方向）</Text>
      {config?.ratingShares.length === 0 && (
        <Text style={{ color: "#9CA3AF", fontSize: 13 }}>共有可能なユーザーがいません</Text>
      )}
      {config?.ratingShares.map((r) => (
        <View key={r.toUserId} style={f.shareRow}>
          <Text style={f.shareUser}>{r.toUsername}</Text>
          <Switch value={r.enabled} onValueChange={(v) => toggleRating(r.toUserId, v)} />
        </View>
      ))}
    </ScrollView>
  );
}

function MediaTypesTab() {
  const [items, setItems] = useState<{ id: string; category: string; name: string; isDefault: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("book");

  const load = async () => {
    setLoading(true);
    try {
      const res = await mediaTypesApi.list();
      setItems(res);
    } catch {
      Alert.alert("エラー", "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!newName.trim()) return;
    try {
      await mediaTypesApi.create(newCategory, newName.trim());
      setNewName("");
      load();
    } catch {
      Alert.alert("エラー", "追加に失敗しました");
    }
  };

  const del = async (id: string) => {
    try {
      await mediaTypesApi.delete(id);
      load();
    } catch {
      Alert.alert("エラー", "削除に失敗しました");
    }
  };

  useEffect(() => { load(); }, []);

  const categories = ["book", "movie", "drama"] as const;
  const catLabel = { book: "書籍", movie: "映画", drama: "ドラマ" };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={f.section}>カスタムメディア種別の追加</Text>
      <View style={f.addRow}>
        <View style={f.categorySelector}>
          {categories.map((c) => (
            <Pressable key={c} style={[f.catChip, newCategory === c && f.catChipActive]} onPress={() => setNewCategory(c)}>
              <Text style={[f.catChipText, newCategory === c && f.catChipTextActive]}>{catLabel[c]}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput style={[f.input, { flex: 1 }]} value={newName} onChangeText={setNewName} placeholder="種別名" />
          <Pressable style={f.addBtn} onPress={add}><Text style={f.addBtnText}>追加</Text></Pressable>
        </View>
      </View>

      {loading ? <ActivityIndicator /> : categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <View key={cat}>
            <Text style={f.catLabel}>{catLabel[cat]}</Text>
            {catItems.map((item) => (
              <View key={item.id} style={f.mediaRow}>
                <Text style={f.mediaName}>{item.name}</Text>
                {item.isDefault ? (
                  <Text style={f.defaultBadge}>デフォルト</Text>
                ) : (
                  <Pressable onPress={() => del(item.id)}>
                    <Text style={f.deleteText}>削除</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#fff" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#111827" },
  tabText: { fontSize: 13, color: "#6B7280" },
  tabTextActive: { color: "#111827", fontWeight: "600" },
});

const f = StyleSheet.create({
  label: { fontSize: 13, color: "#6B7280" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 14 },
  btn: { backgroundColor: "#111827", borderRadius: 10, padding: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  section: { fontSize: 14, fontWeight: "600", color: "#111827" },
  description: { fontSize: 12, color: "#6B7280" },
  shareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 14, borderRadius: 10 },
  shareUser: { fontSize: 14, color: "#111827" },
  addRow: { gap: 8 },
  categorySelector: { flexDirection: "row", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E5E7EB" },
  catChipActive: { backgroundColor: "#111827" },
  catChipText: { fontSize: 13, color: "#374151" },
  catChipTextActive: { color: "#fff" },
  addBtn: { backgroundColor: "#2563EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  addBtnText: { color: "#fff", fontWeight: "600" },
  catLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF", marginBottom: 8, marginTop: 8 },
  mediaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 6 },
  mediaName: { fontSize: 14, color: "#111827" },
  defaultBadge: { fontSize: 11, color: "#6B7280", backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  deleteText: { fontSize: 13, color: "#B91C1C" },
});
