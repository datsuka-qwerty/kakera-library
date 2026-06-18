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
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["sharedDashboardStats", userId],
    queryFn: () => dashboardApi.getUserStats(userId!),
    enabled: !!userId,
  });

  if (isLoading) return <p className="text-sm text-gray-400">{t("common.loading")}</p>;
  if (isError || !stats) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> 戻る
        </button>
        <p className="text-sm text-red-500">ダッシュボードを閲覧できません。共有が許可されていない可能性があります。</p>
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

  const monthlyData = allMonths.slice(-12).map((month) => ({
    month: month.slice(5),
    本: stats.books.byMonth[month] ?? 0,
    映画: stats.movies.byMonth[month] ?? 0,
    ドラマ: stats.dramas.byMonth[month] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> 戻る
        </button>
        <h2 className="text-xl font-bold">共有ダッシュボード</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={BookOpen} label="本（合計）" value={stats.books.total} color="bg-indigo-500" />
        <StatCard icon={Film} label="映画（合計）" value={stats.movies.total} color="bg-emerald-500" />
        <StatCard icon={Tv} label="ドラマ（合計）" value={stats.dramas.total} color="bg-amber-500" />
      </div>

      {monthlyData.length > 0 && (
        <div className="p-5 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-4">月別コンテンツ数（直近12ヶ月）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="本" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="映画" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ドラマ" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "本 ステータス分布", data: booksByStatus },
          { label: "映画 ステータス分布", data: moviesByStatus },
          { label: "ドラマ ステータス分布", data: dramasByStatus },
        ].map(({ label, data }) => (
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
