import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Film, Tv } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { dashboardApi } from "../lib/api/misc";
import { useTranslation } from "react-i18next";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function SharedDashboardPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["sharedDashboardStats", username],
    queryFn: () => dashboardApi.getUserStats(username!),
    enabled: !!username,
  });

  if (isLoading) return <p className="text-sm text-gray-400">{t("common.loading")}</p>;
  if (isError || !stats) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <p className="text-sm text-red-500">{t("sharedDashboard.error")}</p>
      </div>
    );
  }

  const booksByStatus = Object.entries(stats.books.byStatus).map(([k, v]) => ({
    name: t(`book.statuses.${k}`), value: v,
  }));
  const moviesByStatus = Object.entries(stats.movies.byStatus).map(([k, v]) => ({
    name: t(`movie.statuses.${k}`), value: v,
  }));
  const dramasByStatus = Object.entries(stats.dramas.byStatus).map(([k, v]) => ({
    name: t(`drama.statuses.${k}`), value: v,
  }));

  const allMonths = Array.from(new Set([
    ...Object.keys(stats.books.byMonth),
    ...Object.keys(stats.movies.byMonth),
    ...Object.keys(stats.dramas.byMonth),
  ])).sort();

  const booksKey = t("nav.books");
  const moviesKey = t("nav.movies");
  const dramasKey = t("nav.dramas");

  const monthlyData = allMonths.slice(-12).map((month) => ({
    month: month.slice(5),
    [booksKey]: stats.books.byMonth[month] ?? 0,
    [moviesKey]: stats.movies.byMonth[month] ?? 0,
    [dramasKey]: stats.dramas.byMonth[month] ?? 0,
  }));

  const statusCharts = [
    { label: t("dashboard.booksStatus"), data: booksByStatus },
    { label: t("dashboard.moviesStatus"), data: moviesByStatus },
    { label: t("dashboard.dramasStatus"), data: dramasByStatus },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <h2 className="text-xl font-bold">{t("sharedDashboard.title", { username })}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={BookOpen} label={t("dashboard.booksCount", { label: t("dashboard.totalAll") })} value={stats.books.total} color="bg-indigo-500" />
        <StatCard icon={Film} label={t("dashboard.moviesCount", { label: t("dashboard.totalAll") })} value={stats.movies.total} color="bg-emerald-500" />
        <StatCard icon={Tv} label={t("dashboard.dramasCount", { label: t("dashboard.totalAll") })} value={stats.dramas.total} color="bg-amber-500" />
      </div>

      {monthlyData.length > 0 && (
        <div className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-4">{t("sharedDashboard.chartTitle")}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey={booksKey} fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey={moviesKey} fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey={dramasKey} fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusCharts.map(({ label, data }) => (
          data.length > 0 && (
            <div key={label} className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-3">{label}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={false}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
