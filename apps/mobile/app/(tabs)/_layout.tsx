import { Tabs } from "expo-router";
import { LayoutDashboard, BookOpen, Film, Tv, Clapperboard } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, useAccent } from "../../lib/theme";

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const accent = useAccent();

  return (
    <Tabs
      initialRouteName="index"
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
        name="books"
        options={{
          title: t("tabs.books"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BookOpen color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: t("tabs.movies"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Film color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="dramas"
        options={{
          title: t("tabs.dramas"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Tv color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="animes"
        options={{
          title: t("tabs.animes"),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Clapperboard color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
