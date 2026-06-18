import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, Film, Tv, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/books", icon: BookOpen, labelKey: "nav.books" },
  { to: "/movies", icon: Film, labelKey: "nav.movies" },
  { to: "/dramas", icon: Tv, labelKey: "nav.dramas" },
];

export default function Layout() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-surface-DEFAULT dark:bg-surface-elevated-dark">
        <div className="px-4 py-5">
          <h1 className="text-lg font-bold tracking-tight">Kakera Library</h1>
        </div>
        <nav className="flex-1 px-2 space-y-1">
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
              <Icon size={18} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4">
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
            <Settings size={18} />
            {t("nav.settings")}
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
