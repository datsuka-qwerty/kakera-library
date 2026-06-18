import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Drama, DramaCreateInput, DramaStatus } from "@kakera/shared";
import { dramasApi } from "../../lib/api/dramas";
import { mediaTypesApi } from "../../lib/api/misc";
import StarRating from "../ui/StarRating";
import TagBadge from "../ui/TagBadge";

interface Props {
  initial?: Partial<Drama>;
  onSubmit: (data: DramaCreateInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const STATUSES = ["interested", "watching", "completed", "dropped"] as const;

export default function DramaForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [totalSeasons, setTotalSeasons] = useState(initial?.totalSeasons?.toString() ?? "");
  const [firstSeasonAiredAt, setFirstSeasonAiredAt] = useState(initial?.firstSeasonAiredAt ?? "");
  const [currentSeasonAiredAt, setCurrentSeasonAiredAt] = useState(initial?.currentSeasonAiredAt ?? "");
  const [watchStartedAt, setWatchStartedAt] = useState(initial?.watchStartedAt ?? "");
  const [currentSeason, setCurrentSeason] = useState(initial?.currentSeason?.toString() ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "interested");
  const [mediaTypes, setMediaTypes] = useState<string[]>(initial?.mediaTypes ?? []);
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [tmdbId, setTmdbId] = useState(initial?.tmdbId?.toString() ?? "");
  const [metaSearch, setMetaSearch] = useState("");
  const [metaResults, setMetaResults] = useState<Awaited<ReturnType<typeof dramasApi.searchMeta>>>([]);

  const { data: allMediaTypes } = useQuery({ queryKey: ["mediaTypes"], queryFn: mediaTypesApi.list });
  const dramaMediaTypes = allMediaTypes?.filter((m) => m.category === "drama") ?? [];

  const handleMetaSearch = async () => {
    if (!metaSearch.trim()) return;
    const results = await dramasApi.searchMeta(metaSearch);
    setMetaResults(results ?? []);
  };

  const applyMeta = (meta: (typeof metaResults)[0]) => {
    setTitle(meta.title);
    if (meta.coverImageUrl) setCoverImageUrl(meta.coverImageUrl);
    if (meta.releasedAt) setFirstSeasonAiredAt(meta.releasedAt);
    setTmdbId(meta.tmdbId.toString());
    setMetaResults([]);
    setMetaSearch("");
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const showSeasonField = status === "watching" || status === "dropped";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      seriesName: seriesName || undefined,
      totalSeasons: totalSeasons ? parseInt(totalSeasons) : undefined,
      firstSeasonAiredAt: firstSeasonAiredAt || undefined,
      currentSeasonAiredAt: currentSeasonAiredAt || undefined,
      watchStartedAt: watchStartedAt || undefined,
      currentSeason: showSeasonField && currentSeason ? parseInt(currentSeason) : undefined,
      coverImageUrl: coverImageUrl || undefined,
      status: status as DramaCreateInput["status"],
      mediaTypes,
      rating,
      tags,
      memo: memo || undefined,
      tmdbId: tmdbId ? parseInt(tmdbId) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">メタデータ検索（TMDB）</label>
        <div className="flex gap-2">
          <input value={metaSearch} onChange={(e) => setMetaSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMetaSearch())}
            placeholder="タイトルで検索..." className="input flex-1 text-sm" />
          <button type="button" onClick={handleMetaSearch} className="btn-secondary px-3"><Search size={15} /></button>
        </div>
        {metaResults.length > 0 && (
          <ul className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {metaResults.map((m) => (
              <li key={m.tmdbId}>
                <button type="button" onClick={() => applyMeta(m)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex gap-3 items-center">
                  {m.coverImageUrl && <img src={m.coverImageUrl} alt="" className="w-8 h-10 object-cover rounded" />}
                  <span>
                    <p className="font-medium">{m.title}</p>
                    {m.releasedAt && <p className="text-xs text-gray-400">{m.releasedAt}</p>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">{t("drama.title")} *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t("drama.seriesName")}</label>
          <input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("drama.totalSeasons")}</label>
          <input type="number" min={1} value={totalSeasons} onChange={(e) => setTotalSeasons(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("drama.status")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as DramaStatus)} className="input">
            {STATUSES.map((s) => <option key={s} value={s}>{t(`drama.statuses.${s}`)}</option>)}
          </select>
        </div>
        {showSeasonField && (
          <div>
            <label className="form-label">{t("drama.currentSeason")}</label>
            <input type="number" min={1} value={currentSeason} onChange={(e) => setCurrentSeason(e.target.value)} className="input" />
          </div>
        )}
        <div>
          <label className="form-label">第1シーズン放映日</label>
          <input type="date" value={firstSeasonAiredAt} onChange={(e) => setFirstSeasonAiredAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">現行シーズン放映日</label>
          <input type="date" value={currentSeasonAiredAt} onChange={(e) => setCurrentSeasonAiredAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("drama.watchStartedAt")}</label>
          <input type="date" value={watchStartedAt} onChange={(e) => setWatchStartedAt(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">カバー画像URL</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="form-label">{t("drama.mediaTypes")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {dramaMediaTypes.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={mediaTypes.includes(m.name)}
                onChange={(e) => setMediaTypes(e.target.checked ? [...mediaTypes, m.name] : mediaTypes.filter((x) => x !== m.name))}
                className="rounded" />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">{t("drama.rating")}</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="form-label">タグ</label>
        <div className="flex gap-2 mb-2">
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="タグを入力してEnter" className="input flex-1" />
          <button type="button" onClick={addTag} className="btn-secondary px-3 text-sm">追加</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => <TagBadge key={tag} name={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))} />)}
        </div>
      </div>

      <div>
        <label className="form-label">{t("drama.memo")}</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className="input resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="btn-primary">{t("common.save")}</button>
      </div>
    </form>
  );
}
