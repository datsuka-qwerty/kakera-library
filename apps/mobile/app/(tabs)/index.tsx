import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Settings } from "lucide-react-native";
import { dashboardApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

interface Stats {
  books: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
  movies: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
  dramas: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
}

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

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch {
      Alert.alert("エラー", "統計の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = stats ? [
    { label: "書籍", data: stats.books },
    { label: "映画", data: stats.movies },
    { label: "ドラマ", data: stats.dramas },
  ] : [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>ダッシュボード</Text>
        <Pressable onPress={() => router.push("/settings")} style={s.settingsBtn}>
          <Settings size={22} color="#374151" />
        </Pressable>
      </View>
      <Text style={s.welcome}>こんにちは、{user?.username ?? ""}さん</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {sections.map(({ label, data }) => (
            <View key={label} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{label}</Text>
                <Text style={s.cardTotal}>{data.total}件</Text>
              </View>
              <View style={s.statusList}>
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <View key={status} style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[status] ?? "#9CA3AF" }]} />
                    <Text style={s.statusLabel}>{STATUS_LABELS[status] ?? status}</Text>
                    <Text style={s.statusCount}>{count}</Text>
                  </View>
                ))}
              </View>
              {Object.keys(data.byMonth).length > 0 && (
                <View style={s.monthSection}>
                  <Text style={s.monthTitle}>今月の完了</Text>
                  <Text style={s.monthCount}>
                    {Object.entries(data.byMonth).find(([k]) => k === new Date().toISOString().slice(0, 7))?.[1] ?? 0}件
                  </Text>
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
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  settingsBtn: { padding: 6 },
  welcome: { paddingHorizontal: 16, fontSize: 14, color: "#6B7280", marginBottom: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardTotal: { fontSize: 14, color: "#6B7280" },
  statusList: { gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 13, color: "#374151" },
  statusCount: { fontSize: 13, fontWeight: "500", color: "#111827" },
  monthSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", flexDirection: "row", justifyContent: "space-between" },
  monthTitle: { fontSize: 12, color: "#6B7280" },
  monthCount: { fontSize: 12, fontWeight: "600", color: "#111827" },
});
