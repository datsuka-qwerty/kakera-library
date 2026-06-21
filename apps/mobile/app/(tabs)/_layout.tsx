import { Tabs } from "expo-router";
import { LayoutDashboard, BookOpen, Film, Tv } from "lucide-react-native";
import { useTheme, useAccent } from "../../lib/theme";

export default function TabLayout() {
  const theme = useTheme();
  const accent = useAccent();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBorder,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: "本",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BookOpen color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: "映画",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Film color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="dramas"
        options={{
          title: "ドラマ",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Tv color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
