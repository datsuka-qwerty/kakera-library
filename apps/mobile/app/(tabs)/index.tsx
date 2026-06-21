import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react-native";
import { dashboardApi, type DashboardFilter, type DashStats } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useAccent, useTheme } from "../../lib/theme";

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "読みたい", reading: "読書中", completed: "読了", on_hold: "積読",
  unwatched: "未視聴", watched: "視聴済み",
  interested: "気になる", watching: "視聴中", dropped: "途中まで",
};

const STATUS_COLORS: Record<string, string> = {
  want_to_read: "#3B82F6", reading: "#10B981", completed: "#6B7280", on_hold: "#F59E0B",
  unwatched: "#3B82F6", watched: "#6B7280",
  interested: "#8B5CF6", watching: "#10B981", dropped: "#EF4444",
};

type Period = "all" | "yearly" | "monthly";

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

export default function DashboardScreen() {
  const { user, accessToken } = useAuthStore();
  const accent = useAccent();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<Period>("all");
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(false);

  const filter: DashboardFilter = period === "all" ? { period: "all" }
    : period === "yearly" ? { period: "yearly", year }
    : { period: "monthly", year, month };

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await dashboardApi.getStats(filter);
      setStats(data);
    } catch (e: any) {
      if (e?.response?.status !== 401 && useAuthStore.getState().accessToken) {
        Alert.alert("エラー", "統計の読み込みに失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }, [period, year, month, accessToken]);

  // Reload on mount and whenever the filter changes
  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const sections = stats ? [
    { label: "書籍", data: stats.books },
    { label: "映画", data: stats.movies },
    { label: "ドラマ", data: stats.dramas },
  ] : [];

  const totalLabel = period === "all" ? "登録合計"
    : period === "yearly" ? `${year}年の登録数`
    : `${year}年${month}月の登録数`;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "monthly", label: "月間" },
    { key: "yearly", label: "年間" },
    { key: "all", label: "全期間" },
  ];

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[s.headerTitle, { color: theme.text }]}>ダッシュボード</Text>
        <Pressable onPress={() => router.push("/settings")} style={s.settingsBtn}>
          <Settings size={22} color={theme.textSub} />
        </Pressable>
      </View>
      <Text style={[s.welcome, { color: theme.textMuted }]}>こんにちは、{user?.username ?? ""}さん</Text>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.periodBar, { borderBottomColor: theme.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, alignItems: "center" }}>
        <View style={[s.periodTabs, { borderColor: theme.border }]}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              style={[s.periodTab, period === p.key && { backgroundColor: accent }]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[s.periodTabText, { color: period === p.key ? "#fff" : theme.textMuted }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {period === "monthly" && (
          <View style={s.dateNav}>
            <Pressable onPress={prevMonth} style={s.navBtn}>
              <ChevronLeft size={16} color={theme.textSub} />
            </Pressable>
            <Text style={[s.dateLabel, { color: theme.text }]}>{year}年{month}月</Text>
            <Pressable
              onPress={nextMonth}
              style={s.navBtn}
              disabled={year === THIS_YEAR && month === THIS_MONTH}
            >
              <ChevronRight size={16} color={year === THIS_YEAR && month === THIS_MONTH ? theme.borderLight : theme.textSub} />
            </Pressable>
          </View>
        )}

        {period === "yearly" && (
          <View style={s.dateNav}>
            <Pressable onPress={() => setYear((y) => y - 1)} style={s.navBtn}>
              <ChevronLeft size={16} color={theme.textSub} />
            </Pressable>
            <Text style={[s.dateLabel, { color: theme.text }]}>{year}年</Text>
            <Pressable
              onPress={() => setYear((y) => y + 1)}
              style={s.navBtn}
              disabled={year >= THIS_YEAR}
            >
              <ChevronRight size={16} color={year >= THIS_YEAR ? theme.borderLight : theme.textSub} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
          <Text style={[s.periodTitle, { color: theme.textMuted }]}>{totalLabel}</Text>
          {sections.map(({ label, data }) => (
            <View key={label} style={[s.card, { backgroundColor: theme.card }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{label}</Text>
                <Text style={[s.cardTotal, { color: theme.textMuted }]}>{data.total}件</Text>
              </View>
              <View style={s.statusList}>
                {Object.entries(data.byStatus).map(([st, count]) => (
                  <View key={st} style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[st] ?? "#9CA3AF" }]} />
                    <Text style={[s.statusLabel, { color: theme.textSub }]}>{STATUS_LABELS[st] ?? st}</Text>
                    <Text style={[s.statusCount, { color: theme.text }]}>{count}</Text>
                  </View>
                ))}
              </View>
              {Object.keys(data.byMonth).length > 0 && (
                <View style={[s.monthSection, { borderTopColor: theme.borderLight }]}>
                  <Text style={[s.monthTitle, { color: theme.textMuted }]}>
                    {period === "monthly" ? "今月の完了" : period === "yearly" ? `${year}年の完了` : "今月の完了"}
                  </Text>
                  <Text style={[s.monthCount, { color: accent }]}>
                    {period === "monthly"
                      ? (data.byMonth[`${year}-${String(month).padStart(2, "0")}`] ?? 0)
                      : period === "yearly"
                      ? Object.values(data.byMonth).reduce((a, b) => a + b, 0)
                      : (data.byMonth[new Date().toISOString().slice(0, 7)] ?? 0)
                    }件
                  </Text>
                </View>
              )}
              {Object.keys(data.byGenre ?? {}).length > 0 && (
                <View style={[s.genreSection, { borderTopColor: theme.borderLight }]}>
                  <Text style={[s.genreTitle, { color: theme.textMuted }]}>ジャンル分布</Text>
                  <View style={s.genreList}>
                    {Object.entries(data.byGenre)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([g, count]) => (
                        <View key={g} style={s.genreRow}>
                          <Text style={[s.genreLabel, { color: theme.textSub }]} numberOfLines={1}>{g}</Text>
                          <Text style={[s.genreCount, { color: theme.text }]}>{count}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  settingsBtn: { padding: 6 },
  welcome: { paddingHorizontal: 16, fontSize: 14, marginBottom: 4 },
  periodBar: { flexGrow: 0, paddingVertical: 10, borderBottomWidth: 1 },
  periodTabs: { flexDirection: "row", borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  periodTab: { paddingHorizontal: 14, paddingVertical: 6 },
  periodTabText: { fontSize: 13, fontWeight: "500" },
  dateNav: { flexDirection: "row", alignItems: "center", gap: 2 },
  navBtn: { padding: 4 },
  dateLabel: { fontSize: 13, fontWeight: "600", minWidth: 70, textAlign: "center" },
  periodTitle: { fontSize: 12, fontWeight: "600" },
  card: { borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardTotal: { fontSize: 14 },
  statusList: { gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 13 },
  statusCount: { fontSize: 13, fontWeight: "500" },
  monthSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between" },
  monthTitle: { fontSize: 12 },
  monthCount: { fontSize: 12, fontWeight: "600" },
  genreSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  genreTitle: { fontSize: 12, marginBottom: 6 },
  genreList: { gap: 4 },
  genreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  genreLabel: { fontSize: 12, flex: 1, marginRight: 8 },
  genreCount: { fontSize: 12, fontWeight: "500" },
});
