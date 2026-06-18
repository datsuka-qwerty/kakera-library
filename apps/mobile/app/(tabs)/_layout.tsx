import { Tabs } from "expo-router";
import { LayoutDashboard, BookOpen, Film, Tv } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "ダッシュボード",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: "本",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: "映画",
          tabBarIcon: ({ color, size }) => <Film color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dramas"
        options={{
          title: "ドラマ",
          tabBarIcon: ({ color, size }) => <Tv color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
