import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Anime, AnimeCreateInput, AnimeStatus } from "@kakera/shared";
import { animesApi } from "../../lib/api/animes";
import { mediaTypesApi } from "../../lib/api/misc";
import { getMediaTypeName } from "../../lib/mediaTypeLabels";
import StarRating from "../ui/StarRating";
import TagBadge from "../ui/TagBadge";

interface Props {
  initial?: Partial<Anime>;
  onSubmit: (data: AnimeCreateInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const STATUSES = ["interested", "watching", "completed", "dropped"] as const;

export default function AnimeForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [totalSeasons, setTotalSeasons] = useState(initial?.totalSeasons?.toString() ?? "");
  const [firstSeasonAiredAt, setFirstSeasonAiredAt] = useState(initial?.firstSeasonAiredAt ?? "");
  const [currentSeasonAiredAt, setCurrentSeasonAiredAt] = useState(initial?.currentSeasonAiredAt ?? "");
  const [watchStartedAt, setWatchStartedAt] = useState(initial?.watchStartedAt ?? "");
  const [currentSeason, setCurrentSeason] = useState(initial?.currentSeason?.toString() ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [status, setStatus] = useState<AnimeStatus>(initial?.status ?? "interested");
  const [mediaTypes, setMediaTypes] = useState<string[]>(initial?.mediaTypes ?? []);
  const [directors, setDirectors] = useState(initial?.directors?.join(", ") ?? "");
  const [studios, setStudios] = useState<string[]>(initial?.studios ?? []);
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [tmdbId, setTmdbId] = useState(initial?.tmdbId?.toString() ?? "");
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [metaSearch, setMetaSearch] = useState("");
  const [metaResults, setMetaResults] = useState<Awaited<ReturnType<typeof animesApi.searchMeta>>>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [metaPage, setMetaPage] = useState(1);
  const [hasMoreMeta, setHasMoreMeta] = useState(false);

  const { data: allMediaTypes } = useQuery({ queryKey: ["mediaTypes"], queryFn: mediaTypesApi.list });
  const animeMediaTypes = allMediaTypes?.filter((m) => m.category === "anime") ?? [];

  const doMetaSearch = async (page: number, append: boolean) => {
    if (!metaSearch.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await animesApi.searchMeta(metaSearch, page);
      const items = results ?? [];
      setMetaResults(append ? (prev) => [...prev, ...items] : items);
      setMetaPage(page);
      setHasMoreMeta(items.length >= 20);
    } catch {
      setSearchError(t("common.searchFailed"));
      if (!append) setMetaResults([]);
    } finally {
      setSearching(false);
    }
  };
  const handleMetaSearch = () => doMetaSearch(1, false);
  const handleLoadMore = () => doMetaSearch(metaPage + 1, true);

  const applyMeta = (meta: (typeof metaResults)[0]) => {
    setTitle(meta.title);
    if (meta.coverImageUrl) setCoverImageUrl(meta.coverImageUrl);
    if (meta.releasedAt) setFirstSeasonAiredAt(meta.releasedAt);
    setTmdbId(meta.tmdbId.toString());
    if (meta.genres?.length) setGenres(meta.genres);
    if (meta.studios?.length) setStudios(meta.studios);
    if (meta.directors?.length) setDirectors(meta.directors.join(", "));
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
      status,
      mediaTypes,
      genres,
      directors: directors.split(",").map((d) => d.trim()).filter(Boolean),
      studios,
      rating,
      tags,
      memo: memo || undefined,
      tmdbId: tmdbId ? parseInt(tmdbId) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">{t("anime.metaSearch")}</label>
        <div className="flex gap-2">
          <input value={metaSearch} onChange={(e) => setMetaSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMetaSearch())}
            placeholder={t("anime.metaSearchPlaceholder")} className="input flex-1 text-sm" />
          <button type="button" onClick={handleMetaSearch} disabled={searching} className="btn-secondary px-3"><Search size={15} /></button>
        </div>
        {searchError && <p className="mt-1 text-xs text-red-500">{searchError}</p>}
        {metaResults.length > 0 && (
          <div className="mt-1">
            <ul className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
              {metaResults.map((m) => (
                <li key={m.tmdbId}>
                  <button type="button" onClick={() => applyMeta(m)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex gap-3 items-center">
                    {m.coverImageUrl && <img src={m.coverImageUrl} alt="" className="w-8 h-10 object-cover rounded" />}
                    <span>
                      <p className="font-medium">{m.title}</p>
                      {m.releasedAt && <p className="text-xs text-gray-400">{m.releasedAt}</p>}
                      {m.studios && m.studios.length > 0 && <p className="text-xs text-gray-400">{m.studios.join(", ")}</p>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasMoreMeta && (
              <button type="button" onClick={handleLoadMore} disabled={searching}
                className="mt-1 w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 py-1">
                {searching ? t("common.loading") : t("common.loadMore")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">{t("anime.title")} *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t("anime.seriesName")}</label>
          <input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("anime.totalSeasons")}</label>
          <input type="number" min={1} value={totalSeasons} onChange={(e) => setTotalSeasons(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("anime.status")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AnimeStatus)} className="input">
            {STATUSES.map((s) => <option key={s} value={s}>{t(`anime.statuses.${s}`)}</option>)}
          </select>
        </div>
        {showSeasonField && (
          <div>
            <label className="form-label">{t("anime.currentSeason")}</label>
            <input type="number" min={1} value={currentSeason} onChange={(e) => setCurrentSeason(e.target.value)} className="input" />
          </div>
        )}
        <div>
          <label className="form-label">{t("anime.firstSeasonAiredAt")}</label>
          <input type="date" value={firstSeasonAiredAt} onChange={(e) => setFirstSeasonAiredAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("anime.currentSeasonAiredAt")}</label>
          <input type="date" value={currentSeasonAiredAt} onChange={(e) => setCurrentSeasonAiredAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("anime.watchStartedAt")}</label>
          <input type="date" value={watchStartedAt} onChange={(e) => setWatchStartedAt(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t("anime.coverImageUrl")}</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="form-label">{t("anime.mediaTypes")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {animeMediaTypes.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={mediaTypes.includes(m.name)}
                onChange={(e) => setMediaTypes(e.target.checked ? [...mediaTypes, m.name] : mediaTypes.filter((x) => x !== m.name))} />
              {getMediaTypeName(m, i18n.language)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">{t("anime.directors")}</label>
        <input value={directors} onChange={(e) => setDirectors(e.target.value)} placeholder={t("anime.directorsPlaceholder")} className="input" />
      </div>

      {studios.length > 0 && (
        <div>
          <label className="form-label">{t("anime.studios")}</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {studios.map((s) => (
              <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {genres.length > 0 && (
        <div>
          <label className="form-label">{t("anime.genre")}</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {genres.map((g) => (
              <span key={g} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="form-label">{t("anime.rating")}</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="form-label">{t("anime.tags")}</label>
        <div className="flex gap-2 mb-2">
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder={t("anime.tagPlaceholder")} className="input flex-1" />
          <button type="button" onClick={addTag} className="btn-secondary px-3 text-sm">{t("common.add")}</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => <TagBadge key={tag} name={tag} onRemove={() => setTags(tags.filter((tg) => tg !== tag))} />)}
        </div>
      </div>

      <div>
        <label className="form-label">{t("anime.memo")}</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className="input resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="btn-primary">{t("common.save")}</button>
      </div>
    </form>
  );
}
