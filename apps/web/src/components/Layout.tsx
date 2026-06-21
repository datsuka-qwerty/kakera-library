import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Film, Tv, Sun, Moon, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useAuthStore } from "../store/authStore";
import ProfilePopover from "./ProfilePopover";

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
  const { t } = useTranslation();
  const { dark, toggle } = useDarkMode();
  const { user } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <aside className="w-14 md:w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-surface-DEFAULT dark:bg-surface-elevated-dark">
        <div className="px-3 md:px-4 py-5 flex items-center justify-center md:justify-start">
          <h1 className="text-base font-bold tracking-tight hidden md:block">Kakera Library</h1>
          <span className="text-base font-bold md:hidden">K</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              title={t(labelKey)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )
              }
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className="hidden md:inline">{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section: ダークモード → 共有 → アカウント名 */}
        <div className="relative px-2 pb-2 space-y-0.5">
          {profileOpen && <ProfilePopover onClose={() => setProfileOpen(false)} />}

          {/* ダークモード */}
          <button
            onClick={toggle}
            title={dark ? "ライトモード" : "ダークモード"}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {dark ? <Sun size={17} className="flex-shrink-0" /> : <Moon size={17} className="flex-shrink-0" />}
            <span className="hidden md:inline">{dark ? "ライトモード" : "ダークモード"}</span>
          </button>

          {/* 共有 */}
          <NavLink
            to="/sharing"
            onClick={() => setProfileOpen(false)}
            title="共有"
            className={({ isActive }) =>
              clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )
            }
          >
            <Share2 size={17} className="flex-shrink-0" />
            <span className="hidden md:inline">共有</span>
          </NavLink>

          {/* アカウント名 */}
          <button
            onClick={() => setProfileOpen((v) => !v)}
            title={user?.username}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 select-none">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <span className="flex-1 text-left truncate hidden md:inline">{user?.username}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
