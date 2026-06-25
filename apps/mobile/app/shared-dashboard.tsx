import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { dashboardApi } from "../lib/api";
import { useTheme, useAccent } from "../lib/theme";

type DashStats = {
  books: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
  movies: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
  dramas: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
};

const STATUS_COLORS: Record<string, string> = {
  want_to_read: "#3B82F6", reading: "#10B981", completed: "#6B7280", on_hold: "#F59E0B",
  unwatched: "#3B82F6", watched: "#6B7280",
  interested: "#8B5CF6", watching: "#10B981", dropped: "#EF4444",
};

export default function SharedDashboardScreen() {
  const { t } = useTranslation();
  const { username } = useLocalSearchParams<{ username: string }>();
  const theme = useTheme();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    dashboardApi.getUserStats(username)
      .then(setStats)
      .catch(() => Alert.alert(t("common.error"), t("sharedDashboard.loadError")))
      .finally(() => setLoading(false));
  }, [username]);

  const sections = stats ? [
    { label: t("media.book"), data: stats.books },
    { label: t("media.movie"), data: stats.movies },
    { label: t("media.drama"), data: stats.dramas },
  ] : [];

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.textSub} />
        </Pressable>
        <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
          {t("sharedDashboard.title", { username: username ?? t("sharedDashboard.defaultUser") })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={accent} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          {sections.map(({ label, data }) => {
            const thisMonth = new Date().toISOString().slice(0, 7);
            const monthCount = data.byMonth[thisMonth] ?? 0;
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
                      <View style={[s.dot, { backgroundColor: STATUS_COLORS[st] ?? "#9CA3AF" }]} />
                      <Text style={[s.statusLabel, { color: theme.textSub }]}>
                        {t(`status.${st}`, { defaultValue: st })}
                      </Text>
                      <Text style={[s.statusCount, { color: theme.text }]}>{count}</Text>
                    </View>
                  ))}
                </View>
                {Object.keys(data.byMonth).length > 0 && (
                  <View style={[s.monthRow, { borderTopColor: theme.borderLight }]}>
                    <Text style={[s.monthLabel, { color: theme.textMuted }]}>
                      {t("sharedDashboard.thisMonthCompleted")}
                    </Text>
                    <Text style={[s.monthCount, { color: accent }]}>
                      {t("dashboard.count", { n: monthCount })}
                    </Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "600", textAlign: "center" },
  card: { borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardTotal: { fontSize: 14 },
  statusList: { gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 13 },
  statusCount: { fontSize: 13, fontWeight: "500" },
  monthRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between" },
  monthLabel: { fontSize: 12 },
  monthCount: { fontSize: 12, fontWeight: "600" },
});
