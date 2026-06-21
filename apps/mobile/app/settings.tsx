import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
  Platform, PermissionsAndroid,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, LogOut } from "lucide-react-native";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/apiClient";
import { mediaTypesApi, exportImportApi } from "../lib/api";
import type { ImportResult } from "../lib/api";
import { useTheme, useAccent } from "../lib/theme";
import { useDarkModeStore } from "../store/darkModeStore";
import { useLanguageStore } from "../store/languageStore";
import { getMediaTypeName } from "../lib/mediaTypeLabels";

interface ShareTarget { userId: string; username: string; }
interface RatingShareEntry { toUserId: string; toUsername: string; enabled: boolean; }
interface ReceivedShares { dashboardOwners: ShareTarget[]; ratingSharers: ShareTarget[]; }

type TabKey = "profile" | "sharing" | "mediaTypes" | "data" | "appearance";

export default function SettingsScreen() {
  const { user, clearAuth } = useAuthStore();
  const theme = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("profile");

  const logout = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => { clearAuth(); router.replace("/login"); } },
    ]);
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "profile", label: "プロフィール" },
    { key: "sharing", label: "共有" },
    { key: "mediaTypes", label: "メディア" },
    { key: "data", label: "データ" },
    { key: "appearance", label: "外観" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()}><X size={22} color={theme.textSub} /></Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]}>設定</Text>
        <Pressable onPress={logout}><LogOut size={22} color={theme.destructive} /></Pressable>
      </View>

      <View style={[s.tabBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[s.tab, tab === t.key && [s.tabActive, { borderBottomColor: accent }]]}
            onPress={() => setTab(t.key)}>
            <Text
              style={[s.tabText, { color: theme.textMuted }, tab === t.key && { color: accent, fontWeight: "600" }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "sharing" && <SharingTab />}
      {tab === "mediaTypes" && <MediaTypesTab />}
      {tab === "data" && <DataTab />}
      {tab === "appearance" && <AppearanceTab />}
    </View>
  );
}

function ProfileTab({ user }: { user: { username: string; email: string } | null }) {
  const { setAuth, accessToken, refreshToken } = useAuthStore();
  const theme = useTheme();
  const accent = useAccent();
  const { language, setLanguage } = useLanguageStore();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [langSaved, setLangSaved] = useState(false);
  const [selectedLang, setSelectedLang] = useState<"ja" | "en">(language);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ id: string; username: string; email: string; role: string }>("/users/me", {
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

  const applyLanguage = () => {
    setLanguage(selectedLang);
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 2000);
  };

  const langs: { code: "ja" | "en"; label: string; sublabel: string }[] = [
    { code: "ja", label: "日本語", sublabel: "Japanese" },
    { code: "en", label: "English", sublabel: "英語" },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={[f.sectionHeader, { color: theme.text }]}>アカウント</Text>
      <Text style={[f.label, { color: theme.textMuted }]}>メールアドレス</Text>
      <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        placeholderTextColor={theme.placeholder} />
      <Text style={[f.label, { color: theme.textMuted }]}>新しいパスワード（変更する場合のみ）</Text>
      <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={theme.placeholder} />
      <Pressable style={[f.btn, { backgroundColor: accent }, saving && f.btnDisabled]} onPress={save} disabled={saving}>
        <Text style={[f.btnText, { color: theme.accentFg }]}>{saving ? "保存中..." : "保存"}</Text>
      </Pressable>

      <View style={[f.divider, { borderTopColor: theme.border }]} />
      <Text style={[f.sectionHeader, { color: theme.text }]}>言語 / Language</Text>
      <View style={[f.card, { backgroundColor: theme.card }]}>
        {langs.map((l, i) => (
          <Pressable
            key={l.code}
            style={[f.langRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.borderLight }]}
            onPress={() => setSelectedLang(l.code)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[f.shareUser, { color: theme.text }]}>{l.label}</Text>
              <Text style={[f.description, { color: theme.textMuted }]}>{l.sublabel}</Text>
            </View>
            <View style={[f.radio, { borderColor: selectedLang === l.code ? accent : theme.border }]}>
              {selectedLang === l.code && <View style={[f.radioDot, { backgroundColor: accent }]} />}
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[f.btn, { backgroundColor: accent }, selectedLang === language && f.btnDisabled]}
        onPress={applyLanguage}
        disabled={selectedLang === language}
      >
        <Text style={[f.btnText, { color: theme.accentFg }]}>言語を適用</Text>
      </Pressable>
      {langSaved && <Text style={{ fontSize: 13, color: "#16A34A", textAlign: "center" }}>言語を変更しました</Text>}
      <Text style={[f.description, { color: theme.textMuted, lineHeight: 18 }]}>
        Androidの設定 → アプリ → 言語 から、アプリごとに言語を設定することもできます。
      </Text>
    </ScrollView>
  );
}

function SharingTab() {
  const theme = useTheme();
  const accent = useAccent();
  const [dashShares, setDashShares] = useState<ShareTarget[]>([]);
  const [ratingShares, setRatingShares] = useState<RatingShareEntry[]>([]);
  const [received, setReceived] = useState<ReceivedShares>({ dashboardOwners: [], ratingSharers: [] });
  const [allUsers, setAllUsers] = useState<ShareTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [dash, rating, rec, users] = await Promise.all([
        api.get<ShareTarget[]>("/sharing/dashboard"),
        api.get<RatingShareEntry[]>("/sharing/ratings"),
        api.get<ReceivedShares>("/sharing/received"),
        api.get<ShareTarget[]>("/sharing/users"),
      ]);
      setDashShares(Array.isArray(dash) ? dash : []);
      setRatingShares(Array.isArray(rating) ? rating : []);
      setReceived(rec && rec.dashboardOwners ? rec : { dashboardOwners: [], ratingSharers: [] });
      setAllUsers(Array.isArray(users) ? users : []);
    } catch {
      Alert.alert("エラー", "共有設定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const removeDash = async (userId: string) => {
    try {
      await api.delete(`/sharing/dashboard/${userId}`);
      setDashShares((prev) => prev.filter((d) => d.userId !== userId));
    } catch { Alert.alert("エラー", "削除に失敗しました"); }
  };

  const removeRating = async (toUserId: string) => {
    try {
      await api.delete(`/sharing/ratings/${toUserId}`);
      setRatingShares((prev) => prev.filter((r) => r.toUserId !== toUserId));
    } catch { Alert.alert("エラー", "削除に失敗しました"); }
  };

  const addDashShare = async (userId: string) => {
    try { await api.post(`/sharing/dashboard/${userId}`, {}); await load(); }
    catch { Alert.alert("エラー", "追加に失敗しました"); }
  };

  const addRatingShare = async (userId: string) => {
    try { await api.post(`/sharing/ratings/${userId}`, { enabled: true }); await load(); }
    catch { Alert.alert("エラー", "追加に失敗しました"); }
  };

  const filteredUsers = search.trim()
    ? allUsers.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    : [];

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={accent} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={[f.sectionHeader, { color: theme.text }]}>あなたが共有しているユーザー</Text>

      <View style={[f.card, { backgroundColor: theme.card }]}>
        <Text style={[f.subsection, { color: theme.textSub }]}>ダッシュボード</Text>
        {dashShares.length === 0 ? (
          <Text style={[f.empty, { color: theme.textMuted }]}>共有していません</Text>
        ) : dashShares.map((d) => (
          <View key={d.userId} style={[f.shareRow, { borderTopColor: theme.borderLight }]}>
            <Text style={[f.shareUser, { flex: 1, color: theme.text }]}>{d.username}</Text>
            <Pressable onPress={() => removeDash(d.userId)}>
              <Text style={[f.deleteText, { color: theme.destructive }]}>削除</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[f.card, { backgroundColor: theme.card }]}>
        <Text style={[f.subsection, { color: theme.textSub }]}>評価</Text>
        <Text style={[f.description, { color: theme.textMuted }]}>ONにすると相手があなたの評価を閲覧できます</Text>
        {ratingShares.length === 0 ? (
          <Text style={[f.empty, { color: theme.textMuted }]}>共有していません</Text>
        ) : ratingShares.map((r) => (
          <View key={r.toUserId} style={[f.shareRow, { borderTopColor: theme.borderLight }]}>
            <Text style={[f.shareUser, { flex: 1, color: theme.text }]}>{r.toUsername}</Text>
            <Pressable onPress={() => removeRating(r.toUserId)}>
              <Text style={[f.deleteText, { color: theme.destructive }]}>削除</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable style={[f.btn, { backgroundColor: accent }]} onPress={() => { setShowAdd(!showAdd); setSearch(""); }}>
        <Text style={[f.btnText, { color: theme.accentFg }]}>{showAdd ? "キャンセル" : "+ ユーザーを追加"}</Text>
      </Pressable>

      {showAdd && (
        <View style={[f.card, { backgroundColor: theme.card }]}>
          <TextInput
            style={[f.input, { marginBottom: 8, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            value={search} onChangeText={setSearch}
            placeholder="ユーザー名を入力..." placeholderTextColor={theme.placeholder}
          />
          {!search.trim() ? (
            <Text style={[f.empty, { color: theme.textMuted }]}>ユーザー名を入力して検索してください</Text>
          ) : filteredUsers.length === 0 ? (
            <Text style={[f.empty, { color: theme.textMuted }]}>ユーザーが見つかりません</Text>
          ) : filteredUsers.map((u) => {
            const hasDash = dashShares.some((d) => d.userId === u.userId);
            const hasRating = ratingShares.some((r) => r.toUserId === u.userId);
            return (
              <View key={u.userId} style={[f.addUserRow, { borderTopColor: theme.borderLight }]}>
                <Text style={[f.shareUser, { flex: 1, color: theme.text }]}>{u.username}</Text>
                <Pressable style={[f.miniBtn, { backgroundColor: hasDash ? accent : theme.borderLight }]}
                  onPress={() => !hasDash && addDashShare(u.userId)} disabled={hasDash}>
                  <Text style={[f.miniBtnText, { color: hasDash ? theme.accentFg : theme.textSub }]}>ダッシュ</Text>
                </Pressable>
                <Pressable style={[f.miniBtn, { backgroundColor: hasRating ? accent : theme.borderLight }]}
                  onPress={() => !hasRating && addRatingShare(u.userId)} disabled={hasRating}>
                  <Text style={[f.miniBtnText, { color: hasRating ? theme.accentFg : theme.textSub }]}>評価</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={[{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 }]}>
        <Text style={[f.sectionHeader, { color: theme.text }]}>あなたへの共有</Text>
        <View style={[f.card, { backgroundColor: theme.card, marginTop: 12 }]}>
          <Text style={[f.subsection, { color: theme.textSub }]}>ダッシュボード</Text>
          {received.dashboardOwners.length === 0 ? (
            <Text style={[f.empty, { color: theme.textMuted }]}>共有されていません</Text>
          ) : received.dashboardOwners.map((o) => (
            <Pressable
              key={o.userId}
              style={[f.shareRow, { borderTopColor: theme.borderLight }]}
              onPress={() => router.push(`/shared-dashboard?username=${encodeURIComponent(o.username)}`)}
            >
              <Text style={[f.shareUser, { flex: 1, color: theme.text }]}>{o.username}</Text>
              <Text style={[f.viewLink, { color: accent }]}>ダッシュボードを見る →</Text>
            </Pressable>
          ))}
        </View>
        <View style={[f.card, { backgroundColor: theme.card, marginTop: 12 }]}>
          <Text style={[f.subsection, { color: theme.textSub }]}>評価</Text>
          {received.ratingSharers.length === 0 ? (
            <Text style={[f.empty, { color: theme.textMuted }]}>共有されていません</Text>
          ) : received.ratingSharers.map((r) => (
            <View key={r.userId} style={[f.shareRow, { borderTopColor: theme.borderLight }]}>
              <Text style={[f.shareUser, { color: theme.text }]}>{r.username}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MediaTypesTab() {
  const theme = useTheme();
  const accent = useAccent();
  const [items, setItems] = useState<{ id: string; category: string; name: string; isDefault: boolean; key?: string }[]>([]);
  const { language } = useLanguageStore();
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"book" | "movie" | "drama">("book");

  const load = async () => {
    setLoading(true);
    try { const res = await mediaTypesApi.list(); setItems(res); }
    catch { Alert.alert("エラー", "読み込みに失敗しました"); }
    finally { setLoading(false); }
  };

  const add = async () => {
    if (!newName.trim()) return;
    try { await mediaTypesApi.create(newCategory, newName.trim()); setNewName(""); load(); }
    catch { Alert.alert("エラー", "追加に失敗しました"); }
  };

  const del = async (id: string) => {
    try { await mediaTypesApi.delete(id); load(); }
    catch { Alert.alert("エラー", "削除に失敗しました"); }
  };

  useEffect(() => { load(); }, []);

  const categories = ["book", "movie", "drama"] as const;
  const catLabel = { book: "書籍", movie: "映画", drama: "ドラマ" };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={[f.sectionHeader, { color: theme.text }]}>カスタムメディア種別の追加</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {categories.map((c) => (
          <Pressable key={c}
            style={[f.chip, { backgroundColor: newCategory === c ? accent : theme.borderLight }]}
            onPress={() => setNewCategory(c)}>
            <Text style={[f.chipText, { color: newCategory === c ? theme.accentFg : theme.textSub }]}>{catLabel[c]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={[f.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          value={newName} onChangeText={setNewName} placeholder="種別名" placeholderTextColor={theme.placeholder} />
        <Pressable style={[f.addBtn, { backgroundColor: accent }]} onPress={add}>
          <Text style={[f.addBtnText, { color: theme.accentFg }]}>追加</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={accent} /> : categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        return (
          <View key={cat}>
            <Text style={[f.catLabel, { color: theme.textMuted }]}>{catLabel[cat]}</Text>
            {catItems.map((item) => (
              <View key={item.id} style={[f.mediaRow, { backgroundColor: theme.card }]}>
                <Text style={[f.mediaName, { color: theme.text }]} numberOfLines={1}>{getMediaTypeName(item, language)}</Text>
                {item.isDefault ? (
                  <Text style={[f.defaultBadge, { color: theme.textMuted, backgroundColor: theme.borderLight }]}>デフォルト</Text>
                ) : (
                  <Pressable onPress={() => del(item.id)}>
                    <Text style={[f.deleteText, { color: theme.destructive }]}>削除</Text>
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

function DataTab() {
  const theme = useTheme();
  const accent = useAccent();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { json, filename } = await exportImportApi.getExportData();

      if (Platform.OS === "android") {
        // Android: SAF でフォルダを選択してファイル保存
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) return;
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perm.directoryUri,
          filename,
          "application/json"
        );
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        Alert.alert("保存しました", `${filename} を保存しました`);
      } else {
        // iOS: 共有シートでファイルを出力（「ファイル」アプリへ保存可能）
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "JSONファイルを保存",
          UTI: "public.json",
        });
      }
    } catch {
      Alert.alert("エラー", "エクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (jsonText: string, mode: "merge-skip" | "merge-overwrite" | "replace") => {
    setImporting(true);
    setResult(null);
    try {
      const r = await exportImportApi.importData(jsonText, mode);
      setResult(r);
    } catch {
      Alert.alert("エラー", "インポートに失敗しました。JSONの形式を確認してください");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    try {
      // Android API 32以下では READ_EXTERNAL_STORAGE 権限を明示的に要求
      if (Platform.OS === "android" && (Platform.Version as number) <= 32) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "ファイルアクセスの許可",
            message: "JSONファイルをインポートするためにファイルへのアクセスが必要です",
            buttonPositive: "許可",
            buttonNegative: "キャンセル",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("権限が必要です", "ファイルを選択するにはアクセス許可が必要です");
          return;
        }
      }

      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      const file = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);

      try {
        JSON.parse(content);
      } catch {
        Alert.alert("エラー", "JSONの形式が正しくありません");
        return;
      }

      Alert.alert(
        "インポート方法を選択",
        "",
        [
          { text: "追加（重複スキップ）", onPress: () => runImport(content, "merge-skip") },
          { text: "追加（重複上書き）", onPress: () => runImport(content, "merge-overwrite") },
          {
            text: "差し替え（全削除後）",
            style: "destructive",
            onPress: () =>
              Alert.alert("確認", "既存のすべてのデータが削除されます。続けますか？", [
                { text: "キャンセル", style: "cancel" },
                { text: "差し替え", style: "destructive", onPress: () => runImport(content, "replace") },
              ]),
          },
          { text: "キャンセル", style: "cancel" },
        ]
      );
    } catch {
      Alert.alert("エラー", "ファイルの読み込みに失敗しました");
    }
  };

  const summaryLine = (label: string, s: { added: number; updated: number; skipped: number }) => {
    const parts: string[] = [];
    if (s.added > 0) parts.push(`${s.added}件追加`);
    if (s.updated > 0) parts.push(`${s.updated}件上書き`);
    if (s.skipped > 0) parts.push(`${s.skipped}件スキップ`);
    return `${label}: ${parts.length ? parts.join(" / ") : "変更なし"}`;
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={[f.sectionHeader, { color: theme.text }]}>データのエクスポート</Text>
      <View style={[f.card, { backgroundColor: theme.card }]}>
        <Text style={[f.description, { color: theme.textMuted }]}>
          書籍・映画・ドラマのデータをJSONファイルとして出力します
        </Text>
        <Pressable
          style={[f.btn, { backgroundColor: accent, marginTop: 4 }, exporting && f.btnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={[f.btnText, { color: theme.accentFg }]}>
            {exporting ? "エクスポート中..." : "JSONファイルをエクスポート"}
          </Text>
        </Pressable>
      </View>

      <View style={[f.divider, { borderTopColor: theme.border }]} />

      <Text style={[f.sectionHeader, { color: theme.text }]}>データのインポート</Text>
      <View style={[f.card, { backgroundColor: theme.card }]}>
        <Text style={[f.description, { color: theme.textMuted }]}>
          エクスポートしたJSONファイルを選択してインポートします
        </Text>
        <Pressable
          style={[f.btn, { backgroundColor: theme.borderLight, marginTop: 4 }, importing && f.btnDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          <Text style={[f.btnText, { color: theme.text }]}>
            {importing ? "インポート中..." : "JSONファイルを選択"}
          </Text>
        </Pressable>
      </View>

      {result && (
        <View style={[f.card, { backgroundColor: theme.card, borderWidth: 1, borderColor: "#16A34A" }]}>
          <Text style={[f.sectionHeader, { color: "#16A34A", fontSize: 14 }]}>インポートが完了しました</Text>
          {([
            { key: "books" as const, label: "書籍" },
            { key: "movies" as const, label: "映画" },
            { key: "dramas" as const, label: "ドラマ" },
          ] as const).map(({ key, label }) => (
            <Text key={key} style={[f.description, { color: theme.textSub }]}>
              {summaryLine(label, result[key])}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function AppearanceTab() {
  const theme = useTheme();
  const { isDark, setDark } = useDarkModeStore();

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={[f.sectionHeader, { color: theme.text }]}>表示モード</Text>
      <View style={[f.card, { backgroundColor: theme.card }]}>
        <View style={[f.shareRow, { borderTopWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[f.shareUser, { color: theme.text }]}>ダークモード</Text>
            <Text style={[f.description, { color: theme.textMuted }]}>
              {isDark ? "ダークモードで表示中" : "ライトモードで表示中"}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={setDark}
            trackColor={{ true: theme.accent }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: {},
  tabText: { fontSize: 13 },
});


const f = StyleSheet.create({
  sectionHeader: { fontSize: 15, fontWeight: "700" },
  subsection: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  label: { fontSize: 13, marginBottom: -8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontWeight: "600", fontSize: 15 },
  description: { fontSize: 12 },
  empty: { fontSize: 13, marginTop: 4 },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  card: { borderRadius: 12, padding: 14, gap: 8 },
  shareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1 },
  langRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  shareUser: { fontSize: 14 },
  viewLink: { fontSize: 13, fontWeight: "500" },
  deleteText: { fontSize: 13 },
  addUserRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, borderTopWidth: 1 },
  miniBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  miniBtnText: { fontSize: 12, fontWeight: "500" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13 },
  addBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, justifyContent: "center" },
  addBtnText: { fontWeight: "600" },
  catLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  mediaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, marginBottom: 6 },
  mediaName: { fontSize: 14, flex: 1, marginRight: 8 },
  defaultBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
