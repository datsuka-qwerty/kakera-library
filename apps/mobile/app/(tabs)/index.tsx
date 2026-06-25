import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { dashboardApi, type DashboardFilter, type DashStats } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useAccent, useTheme } from "../../lib/theme";

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
  const { t } = useTranslation();
  const { user, accessToken } = useAuthStore();
  const accent = useAccent();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<Period>("all");
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const filter: DashboardFilter = period === "all" ? { period: "all" }
    : period === "yearly" ? { period: "yearly", year }
    : { period: "monthly", year, month };

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await dashboardApi.getStats(filter);
      setStats(data);
      setLoadError(false);
    } catch (e: any) {
      if (e?.response?.status !== 401 && useAuthStore.getState().accessToken) {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [period, year, month, accessToken]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const PERIODS: { key: Period; label: string }[] = [
    { key: "monthly", label: t("dashboard.periodMonthly") },
    { key: "yearly", label: t("dashboard.periodYearly") },
    { key: "all", label: t("dashboard.periodAll") },
  ];

  const sections = stats ? [
    { label: t("media.book"), data: stats.books },
    { label: t("media.movie"), data: stats.movies },
    { label: t("media.drama"), data: stats.dramas },
  ] : [];

  const totalLabel = period === "all" ? t("dashboard.totalAll")
    : period === "yearly" ? t("dashboard.totalYear", { year })
    : t("dashboard.totalMonth", { year, month });

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[s.headerTitle, { color: theme.text }]}>{t("dashboard.title")}</Text>
        <Pressable onPress={() => router.push("/settings")} style={s.settingsBtn}>
          <Settings size={22} color={theme.textSub} />
        </Pressable>
      </View>
      <Text style={[s.welcome, { color: theme.textMuted }]}>
        {t("dashboard.greeting", { name: user?.username ?? "" })}
      </Text>

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
            <Text style={[s.dateLabel, { color: theme.text }]}>
              {t("dashboard.dateMonthYear", { year, month })}
            </Text>
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
            <Text style={[s.dateLabel, { color: theme.text }]}>
              {t("dashboard.dateYear", { year })}
            </Text>
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

      {loadError && !loading && (
        <View style={[s.errorBanner, { backgroundColor: theme.card, borderColor: "#EF4444" }]}>
          <Text style={[s.errorText, { color: "#EF4444" }]}>{t("dashboard.serverError")}</Text>
          <Pressable onPress={load} style={s.retryBtn}>
            <Text style={[s.retryText, { color: accent }]}>{t("dashboard.retry")}</Text>
          </Pressable>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
          <Text style={[s.periodTitle, { color: theme.textMuted }]}>{totalLabel}</Text>
          {sections.map(({ label, data }) => {
            const monthKey = `${year}-${String(month).padStart(2, "0")}`;
            const monthCount = period === "monthly"
              ? (data.byMonth[monthKey] ?? 0)
              : period === "yearly"
              ? Object.values(data.byMonth).reduce((a, b) => a + b, 0)
              : (data.byMonth[new Date().toISOString().slice(0, 7)] ?? 0);
            const monthTitle = period === "yearly"
              ? t("dashboard.yearCompleted", { year })
              : t("dashboard.thisMonthCompleted");

            return (
              <View key={label} style={[s.card, { backgroundColor: theme.card }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, { color: theme.text }]}>{label}</Text>
                  <Text style={[s.cardTotal, { color: theme.textMuted }]}>
                    {t("dashboard.count", { n: data.total })}
                  </Text>
                </View>
                <View style={s.statusList}>
                  {Object.entries(data.byStatus).map(([st, count]) => (
                    <View key={st} style={s.statusRow}>
                      <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[st] ?? "#9CA3AF" }]} />
                      <Text style={[s.statusLabel, { color: theme.textSub }]}>
                        {t(`status.${st}`, { defaultValue: st })}
                      </Text>
                      <Text style={[s.statusCount, { color: theme.text }]}>{count}</Text>
                    </View>
                  ))}
                </View>
                {Object.keys(data.byMonth).length > 0 && (
                  <View style={[s.monthSection, { borderTopColor: theme.borderLight }]}>
                    <Text style={[s.monthTitle, { color: theme.textMuted }]}>{monthTitle}</Text>
                    <Text style={[s.monthCount, { color: accent }]}>
                      {t("dashboard.count", { n: monthCount })}
                    </Text>
                  </View>
                )}
                {Object.keys(data.byGenre ?? {}).length > 0 && (
                  <View style={[s.genreSection, { borderTopColor: theme.borderLight }]}>
                    <Text style={[s.genreTitle, { color: theme.textMuted }]}>{t("dashboard.genreDistribution")}</Text>
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
            );
          })}
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
  errorBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 13 },
  retryBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  retryText: { fontSize: 13, fontWeight: "600" },
});
