import { View, Text } from "react-native";

const colorMap: Record<string, { bg: string; text: string }> = {
  want_to_read:  { bg: "#DBEAFE", text: "#1D4ED8" },
  reading:       { bg: "#DCFCE7", text: "#15803D" },
  completed:     { bg: "#F3F4F6", text: "#374151" },
  on_hold:       { bg: "#FEF3C7", text: "#B45309" },
  unwatched:     { bg: "#DBEAFE", text: "#1D4ED8" },
  watched:       { bg: "#F3F4F6", text: "#374151" },
  interested:    { bg: "#F3E8FF", text: "#6D28D9" },
  watching:      { bg: "#DCFCE7", text: "#15803D" },
  dropped:       { bg: "#FEE2E2", text: "#B91C1C" },
};

const labelMap: Record<string, string> = {
  want_to_read: "読みたい", reading: "読書中", completed: "読了", on_hold: "積読",
  unwatched: "未視聴", watched: "視聴済み",
  interested: "気になる", watching: "視聴中", dropped: "途中まで",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = colorMap[status] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "500" }}>
        {labelMap[status] ?? status}
      </Text>
    </View>
  );
}
