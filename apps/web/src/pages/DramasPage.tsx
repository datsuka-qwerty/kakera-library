import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Share2, Layers, List, ChevronRight } from "lucide-react";
import ShareModal from "../components/ui/ShareModal";
import type { Drama, DramaCreateInput } from "@kakera/shared";
import { dramasApi } from "../lib/api/dramas";
import SearchBar from "../components/ui/SearchBar";
import StatusBadge from "../components/ui/StatusBadge";
import StarRating from "../components/ui/StarRating";
import TagBadge from "../components/ui/TagBadge";
import CoverImage from "../components/ui/CoverImage";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import DramaForm from "../components/dramas/DramaForm";

const STATUSES = ["", "interested", "watching", "completed", "dropped"];

export default function DramasPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Drama | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["dramas", { search, status, page: groupBySeries ? 1 : page }],
    queryFn: () => dramasApi.list({
      search: search || undefined,
      status: status || undefined,
      page: groupBySeries ? 1 : page,
      perPage: groupBySeries ? 500 : 20,
    }),
  });

  const seriesGroups = useMemo(() => {
    const dramas = data?.data ?? [];
    const groups = new Map<string, Drama[]>();
    dramas.forEach((d) => {
      const key = d.seriesName ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    });
    groups.forEach((items) => items.sort((a, b) =>
      (a.firstSeasonAiredAt ?? "").localeCompare(b.firstSeasonAiredAt ?? "")
    ));
    return groups;
  }, [data?.data]);

  const toggleSeries = (key: string) =>
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const createMutation = useMutation({
    mutationFn: dramasApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dramas"] }); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DramaCreateInput> }) => dramasApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dramas"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: dramasApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dramas"] }),
  });

  return (
    <div className="space-y-4">
      {shareOpen && <ShareModal type="rating" onClose={() => setShareOpen(false)} />}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t("nav.dramas")}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 size={14} />
            共有
          </button>
          <button
            onClick={() => setGroupBySeries((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${groupBySeries ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          >
            {groupBySeries ? <List size={15} /> : <Layers size={15} />}
            {groupBySeries ? "一覧表示" : "シリーズ別"}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t("common.add")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-auto text-sm">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? t(`drama.statuses.${s}`) : "すべてのステータス"}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      ) : groupBySeries ? (
        <div className="space-y-2">
          {Array.from(seriesGroups.entries()).map(([seriesKey, dramas]) => {
            if (seriesKey === "__none__") {
              return dramas.map((drama) => <DramaRow key={drama.id} drama={drama} onEdit={setEditing} onDelete={(d) => { if (confirm(`「${d.title}」を削除しますか？`)) deleteMutation.mutate(d.id); }} t={t} />);
            }
            const isExpanded = expandedSeries.has(seriesKey);
            return (
              <div key={seriesKey}>
                <button
                  onClick={() => toggleSeries(seriesKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <CoverImage src={dramas[0]?.coverImageUrl} alt={seriesKey} className="w-8 h-11" />
                  <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span className="text-sm font-semibold flex-1 text-gray-800 dark:text-gray-200">{seriesKey}</span>
                  <span className="text-xs text-gray-400">{dramas.length}作品</span>
                </button>
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {dramas.map((drama) => <DramaRow key={drama.id} drama={drama} onEdit={setEditing} onDelete={(d) => { if (confirm(`「${d.title}」を削除しますか？`)) deleteMutation.mutate(d.id); }} t={t} />)}
                  </div>
                )}
              </div>
            );
          })}
          {(data?.data ?? []).length === 0 && <p className="text-sm text-gray-400 py-8 text-center">登録されたドラマがありません</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((drama) => (
            <DramaRow key={drama.id} drama={drama} onEdit={setEditing} onDelete={(d) => { if (confirm(`「${d.title}」を削除しますか？`)) deleteMutation.mutate(d.id); }} t={t} />
          ))}
          {(data?.data?.length ?? 0) === 0 && <p className="text-sm text-gray-400 py-8 text-center">登録されたドラマがありません</p>}
        </div>
      )}

      {data && !groupBySeries && <Pagination page={page} total={data.total} perPage={data.perPage} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ドラマを追加" size="lg">
        <DramaForm onSubmit={(d) => createMutation.mutate(d)} onCancel={() => setModalOpen(false)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="ドラマを編集" size="lg">
        {editing && <DramaForm initial={editing} onSubmit={(d) => updateMutation.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} loading={updateMutation.isPending} />}
      </Modal>
    </div>
  );
}

function DramaRow({ drama, onEdit, onDelete, t }: { drama: Drama; onEdit: (d: Drama) => void; onDelete: (d: Drama) => void; t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <CoverImage src={drama.coverImageUrl} alt={drama.title} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{drama.title}</p>
            {drama.seriesName && <p className="text-xs text-gray-500">{drama.seriesName}</p>}
            {drama.totalSeasons && <p className="text-xs text-gray-400 mt-0.5">{drama.totalSeasons}シーズン</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {drama.currentSeason && (drama.status === "watching" || drama.status === "dropped") && (
              <span className="text-xs text-gray-400">S{drama.currentSeason}</span>
            )}
            <StatusBadge status={drama.status} category="drama" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <StarRating value={drama.rating} readonly />
          {drama.tags.map((tag) => <TagBadge key={tag} name={tag} />)}
          {drama.mediaTypes.map((m) => <span key={m} className="text-xs text-gray-400">{m}</span>)}
        </div>
        {drama.sharedRatings && drama.sharedRatings.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {drama.sharedRatings.map((sr) => (
              <div key={sr.username} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{sr.username}</span>
                <StarRating value={sr.rating} readonly />
              </div>
            ))}
          </div>
        )}
        {drama.memo && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{drama.memo}</p>}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={() => onEdit(drama)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{t("common.edit")}</button>
        <button onClick={() => onDelete(drama)} className="text-xs text-red-400 hover:text-red-600">{t("common.delete")}</button>
      </div>
    </div>
  );
}
