import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Film, Tv, Settings, Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import clsx from "clsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/books", icon: BookOpen, labelKey: "nav.books" },
  { to: "/movies", icon: Film, labelKey: "nav.movies" },
  { to: "/dramas", icon: Tv, labelKey: "nav.dramas" },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = saved ? saved === "dark" : prefersDark;
    setDark(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);
  }, []);
  return { dark, toggle };
}

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { dark, toggle } = useDarkMode();

  return (
    <div className="flex h-screen">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-surface-DEFAULT dark:bg-surface-elevated-dark">
        <div className="px-4 py-5">
          <h1 className="text-base font-bold tracking-tight">Kakera Library</h1>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )
              }
            >
              <Icon size={17} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-2 space-y-0.5">
          {/* Language toggle */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language === "ja" ? "en" : "ja")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            🌐 {i18n.language === "ja" ? "English" : "日本語"}
          </button>
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            {dark ? "ライトモード" : "ダークモード"}
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )
            }
          >
            <Settings size={17} />
            {t("nav.settings")}
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
