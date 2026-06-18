import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
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

  const { data, isLoading } = useQuery({
    queryKey: ["dramas", { search, status, page }],
    queryFn: () => dramasApi.list({ search: search || undefined, status: status || undefined, page, perPage: 20 }),
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.dramas")}</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t("common.add")}
        </button>
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
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((drama) => (
            <div key={drama.id}
              className="flex gap-4 p-4 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
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
                {drama.memo && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{drama.memo}</p>}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => setEditing(drama)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{t("common.edit")}</button>
                <button onClick={() => { if (confirm(`「${drama.title}」を削除しますか？`)) deleteMutation.mutate(drama.id); }}
                  className="text-xs text-red-400 hover:text-red-600">{t("common.delete")}</button>
              </div>
            </div>
          ))}
          {data?.data.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">登録されたドラマがありません</p>}
        </div>
      )}

      {data && <Pagination page={page} total={data.total} perPage={data.perPage} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ドラマを追加" size="lg">
        <DramaForm onSubmit={(d) => createMutation.mutate(d)} onCancel={() => setModalOpen(false)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="ドラマを編集" size="lg">
        {editing && <DramaForm initial={editing} onSubmit={(d) => updateMutation.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} loading={updateMutation.isPending} />}
      </Modal>
    </div>
  );
}
