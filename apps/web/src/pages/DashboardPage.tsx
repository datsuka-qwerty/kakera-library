import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BookOpen, Film, Tv, Clapperboard, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { dashboardApi, type DashboardFilter } from "../lib/api/misc";
import ShareModal from "../components/ui/ShareModal";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type Period = "all" | "yearly" | "monthly";

const now = new Date();
const THIS_YEAR = now.getFullYear();
const THIS_MONTH = now.getMonth() + 1;

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

function PeriodSelector({ period, year, month, onChangePeriod, onChangeYear, onChangeMonth }: {
  period: Period;
  year: number;
  month: number;
  onChangePeriod: (p: Period) => void;
  onChangeYear: (y: number) => void;
  onChangeMonth: (m: number) => void;
}) {
  const { t } = useTranslation();

  const tabs: { key: Period; label: string }[] = [
    { key: "monthly", label: t("dashboard.monthly") },
    { key: "yearly", label: t("dashboard.yearly") },
    { key: "all", label: t("dashboard.all") },
  ];

  const prevMonth = () => {
    if (month === 1) { onChangeMonth(12); onChangeYear(year - 1); }
    else onChangeMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { onChangeMonth(1); onChangeYear(year + 1); }
    else onChangeMonth(month + 1);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => onChangePeriod(tb.key)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              period === tb.key
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {period === "monthly" && (
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-20 text-center">
            {t("dashboard.yearMonth", { year, month })}
          </span>
          <button
            onClick={nextMonth}
            disabled={year === THIS_YEAR && month === THIS_MONTH}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {period === "yearly" && (
        <div className="flex items-center gap-1">
          <button onClick={() => onChangeYear(year - 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-16 text-center">{t("dashboard.year", { year })}</span>
          <button
            onClick={() => onChangeYear(year + 1)}
            disabled={year >= THIS_YEAR}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);

  const filter: DashboardFilter = period === "all" ? { period: "all" }
    : period === "yearly" ? { period: "yearly", year }
    : { period: "monthly", year, month };

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardStats", filter],
    queryFn: () => dashboardApi.getStats(filter),
  });

  const periodLabel = period === "monthly" ? t("dashboard.yearMonth", { year, month })
    : period === "yearly" ? t("dashboard.year", { year })
    : t("dashboard.all");

  if (isLoading) return <p className="text-sm text-gray-400">{t("common.loading")}</p>;
  if (!stats) return null;

  const booksByStatus = Object.entries(stats.books.byStatus).map(([k, v]) => ({
    name: t(`book.statuses.${k}`), value: v,
  }));
  const moviesByStatus = Object.entries(stats.movies.byStatus).map(([k, v]) => ({
    name: t(`movie.statuses.${k}`), value: v,
  }));
  const dramasByStatus = Object.entries(stats.dramas.byStatus).map(([k, v]) => ({
    name: t(`drama.statuses.${k}`), value: v,
  }));
  const animesByStatus = Object.entries(stats.animes.byStatus).map(([k, v]) => ({
    name: t(`anime.statuses.${k}`), value: v,
  }));

  const booksByGenre = Object.entries(stats.books.byGenre ?? {})
    .sort(([, a], [, b]) => b - a).slice(0, 10).map(([k, v]) => ({ name: k, value: v }));
  const moviesByGenre = Object.entries(stats.movies.byGenre ?? {})
    .sort(([, a], [, b]) => b - a).slice(0, 10).map(([k, v]) => ({ name: k, value: v }));
  const dramasByGenre = Object.entries(stats.dramas.byGenre ?? {})
    .sort(([, a], [, b]) => b - a).slice(0, 10).map(([k, v]) => ({ name: k, value: v }));
  const animesByGenre = Object.entries(stats.animes.byGenre ?? {})
    .sort(([, a], [, b]) => b - a).slice(0, 10).map(([k, v]) => ({ name: k, value: v }));

  const allMonths = Array.from(new Set([
    ...Object.keys(stats.books.byMonth),
    ...Object.keys(stats.movies.byMonth),
    ...Object.keys(stats.dramas.byMonth),
    ...Object.keys(stats.animes.byMonth),
  ])).sort();

  const displayMonths = period === "all" ? allMonths.slice(-24) : allMonths;

  const booksKey = t("nav.books");
  const moviesKey = t("nav.movies");
  const dramasKey = t("nav.dramas");
  const animesKey = t("nav.animes");

  const monthlyData = displayMonths.map((m) => ({
    month: period === "yearly"
      ? t("dashboard.monthUnit", { n: parseInt(m.slice(5)) })
      : m.slice(5),
    [booksKey]: stats.books.byMonth[m] ?? 0,
    [moviesKey]: stats.movies.byMonth[m] ?? 0,
    [dramasKey]: stats.dramas.byMonth[m] ?? 0,
    [animesKey]: stats.animes.byMonth[m] ?? 0,
  }));

  const barChartTitle = period === "monthly"
    ? t("dashboard.chartMonthly", { year, month })
    : period === "yearly"
    ? t("dashboard.chartYearly", { year })
    : t("dashboard.chartAll");

  const totalLabel = period === "all"
    ? t("dashboard.totalAll")
    : t("dashboard.totalPeriod", { period: periodLabel });

  const pieCharts = [
    { label: t("dashboard.booksStatus"), data: booksByStatus },
    { label: t("dashboard.moviesStatus"), data: moviesByStatus },
    { label: t("dashboard.dramasStatus"), data: dramasByStatus },
    { label: t("dashboard.animesStatus"), data: animesByStatus },
  ];

  const genreCharts = [
    { label: t("dashboard.booksGenre"), data: booksByGenre, color: "#6366f1" },
    { label: t("dashboard.moviesGenre"), data: moviesByGenre, color: "#22c55e" },
    { label: t("dashboard.dramasGenre"), data: dramasByGenre, color: "#f59e0b" },
    { label: t("dashboard.animesGenre"), data: animesByGenre, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {shareOpen && <ShareModal type="dashboard" onClose={() => setShareOpen(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">{t("nav.dashboard")}</h2>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Share2 size={14} />
          {t("content.share")}
        </button>
      </div>

      <PeriodSelector
        period={period} year={year} month={month}
        onChangePeriod={setPeriod} onChangeYear={setYear} onChangeMonth={setMonth}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label={t("dashboard.booksCount", { label: totalLabel })} value={stats.books.total} color="bg-indigo-500" />
        <StatCard icon={Film} label={t("dashboard.moviesCount", { label: totalLabel })} value={stats.movies.total} color="bg-emerald-500" />
        <StatCard icon={Tv} label={t("dashboard.dramasCount", { label: totalLabel })} value={stats.dramas.total} color="bg-amber-500" />
        <StatCard icon={Clapperboard} label={t("dashboard.animesCount", { label: totalLabel })} value={stats.animes.total} color="bg-violet-500" />
      </div>

      {monthlyData.length > 0 && (
        <div className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-4">{barChartTitle}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey={booksKey} fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey={moviesKey} fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey={dramasKey} fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey={animesKey} fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {pieCharts.map(({ label, data }) => (
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

      {genreCharts.filter(({ data }) => data.length > 0).map(({ label, data, color }) => (
        <div key={label} className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-4">{label}</h3>
          <ResponsiveContainer width="100%" height={Math.max(120, data.length * 28)}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
