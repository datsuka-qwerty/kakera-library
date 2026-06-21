import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Movie, MovieCreateInput, MovieStatus } from "@kakera/shared";
import { moviesApi } from "../../lib/api/movies";
import { mediaTypesApi } from "../../lib/api/misc";
import { getMediaTypeName } from "../../lib/mediaTypeLabels";
import StarRating from "../ui/StarRating";
import TagBadge from "../ui/TagBadge";

interface Props {
  initial?: Partial<Movie>;
  onSubmit: (data: MovieCreateInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const STATUSES = ["unwatched", "watched"] as const;

export default function MovieForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [seriesOrder, setSeriesOrder] = useState(initial?.seriesOrder?.toString() ?? "");
  const [directors, setDirectors] = useState(initial?.directors?.join(", ") ?? "");
  const [releasedAt, setReleasedAt] = useState(initial?.releasedAt ?? "");
  const [watchedAt, setWatchedAt] = useState(initial?.watchedAt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "unwatched");
  const [mediaTypes, setMediaTypes] = useState<string[]>(initial?.mediaTypes ?? []);
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [tmdbId, setTmdbId] = useState(initial?.tmdbId?.toString() ?? "");
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [metaSearch, setMetaSearch] = useState("");
  const [metaResults, setMetaResults] = useState<Awaited<ReturnType<typeof moviesApi.searchMeta>>>([]);

  const { data: allMediaTypes } = useQuery({ queryKey: ["mediaTypes"], queryFn: mediaTypesApi.list });
  const movieMediaTypes = allMediaTypes?.filter((m) => m.category === "movie") ?? [];

  const handleMetaSearch = async () => {
    if (!metaSearch.trim()) return;
    const results = await moviesApi.searchMeta(metaSearch);
    setMetaResults(results ?? []);
  };

  const applyMeta = (meta: (typeof metaResults)[0]) => {
    setTitle(meta.title);
    if (meta.coverImageUrl) setCoverImageUrl(meta.coverImageUrl);
    if (meta.releasedAt) setReleasedAt(meta.releasedAt);
    setTmdbId(meta.tmdbId.toString());
    if (meta.genres?.length) setGenres(meta.genres);
    setMetaResults([]);
    setMetaSearch("");
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      seriesName: seriesName || undefined,
      seriesOrder: seriesOrder ? parseInt(seriesOrder) : undefined,
      directors: directors.split(",").map((d) => d.trim()).filter(Boolean),
      releasedAt: releasedAt || undefined,
      watchedAt: watchedAt || undefined,
      coverImageUrl: coverImageUrl || undefined,
      status: status as MovieCreateInput["status"],
      mediaTypes,
      genres,
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
          <input
            value={metaSearch}
            onChange={(e) => setMetaSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMetaSearch())}
            placeholder="タイトルで検索..."
            className="input flex-1 text-sm"
          />
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
          <label className="form-label">{t("movie.title")} *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("movie.seriesName")}</label>
          <input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">シリーズ順</label>
          <input type="number" min={1} value={seriesOrder} onChange={(e) => setSeriesOrder(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t("movie.directors")}</label>
          <input value={directors} onChange={(e) => setDirectors(e.target.value)} placeholder="カンマ区切り" className="input" />
        </div>
        <div>
          <label className="form-label">{t("movie.releasedAt")}</label>
          <input type="date" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("movie.watchedAt")}</label>
          <input type="date" value={watchedAt} onChange={(e) => setWatchedAt(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">カバー画像URL</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("movie.status")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as MovieStatus)} className="input">
            {STATUSES.map((s) => <option key={s} value={s}>{t(`movie.statuses.${s}`)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">{t("movie.mediaTypes")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {movieMediaTypes.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={mediaTypes.includes(m.name)}
                onChange={(e) => setMediaTypes(e.target.checked ? [...mediaTypes, m.name] : mediaTypes.filter((x) => x !== m.name))} />
              {getMediaTypeName(m, i18n.language)}
            </label>
          ))}
        </div>
      </div>

      {genres.length > 0 && (
        <div>
          <label className="form-label">ジャンル</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {genres.map((g) => (
              <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="form-label">{t("movie.rating")}</label>
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
        <label className="form-label">{t("movie.memo")}</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className="input resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="btn-primary">{t("common.save")}</button>
      </div>
    </form>
  );
}
