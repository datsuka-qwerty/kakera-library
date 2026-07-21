import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Share2, Layers, List, ChevronRight } from "lucide-react";
import ShareModal from "../components/ui/ShareModal";
import type { Movie, MovieCreateInput } from "@kakera/shared";
import { moviesApi } from "../lib/api/movies";
import SearchBar from "../components/ui/SearchBar";
import StatusBadge from "../components/ui/StatusBadge";
import StarRating from "../components/ui/StarRating";
import TagBadge from "../components/ui/TagBadge";
import CoverImage from "../components/ui/CoverImage";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import MovieForm from "../components/movies/MovieForm";

const STATUSES = ["", "unwatched", "watched"];
const SORT_OPTIONS = [
  { value: "created_at", labelKey: "content.sortCreatedAt" },
  { value: "released_at", labelKey: "content.sortReleasedAt" },
  { value: "title", labelKey: "content.sortTitle" },
  { value: "rating", labelKey: "content.sortRating" },
];

export default function MoviesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [genre, setGenre] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [minRating, setMinRating] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [director, setDirector] = useState("");
  const [studio, setStudio] = useState("");
  const [distributor, setDistributor] = useState("");

  const { data: options } = useQuery({ queryKey: ["movies-options"], queryFn: moviesApi.getOptions });

  const { data, isLoading } = useQuery({
    queryKey: ["movies", { search, status, genre, filterTag, director, studio, distributor, minRating, page: groupBySeries ? 1 : page, sort, order }],
    queryFn: () => moviesApi.list({
      search: search || undefined,
      status: status || undefined,
      genre: genre || undefined,
      tag: filterTag || undefined,
      director: director || undefined,
      studio: studio || undefined,
      distributor: distributor || undefined,
      rating: minRating ? parseInt(minRating) : undefined,
      page: groupBySeries ? 1 : page,
      perPage: groupBySeries ? 500 : 20,
      sort,
      order,
    }),
  });

  const seriesGroups = useMemo(() => {
    const movies = data?.data ?? [];
    const groups = new Map<string, Movie[]>();
    movies.forEach((m) => {
      const key = m.seriesName ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    groups.forEach((items) => items.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)));
    return groups;
  }, [data?.data]);

  const toggleSeries = (key: string) =>
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const createMutation = useMutation({
    mutationFn: moviesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movies"] }); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MovieCreateInput> }) => moviesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movies"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: moviesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });

  const handleDelete = (m: Movie) => {
    if (confirm(t("content.deleteConfirm", { title: m.title }))) deleteMutation.mutate(m.id);
  };

  return (
    <div className="space-y-4">
      {shareOpen && <ShareModal type="rating" onClose={() => setShareOpen(false)} />}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t("nav.movies")}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Share2 size={14} />
            {t("content.share")}
          </button>
          <button
            onClick={() => setGroupBySeries((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${groupBySeries ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          >
            {groupBySeries ? <List size={15} /> : <Layers size={15} />}
            {groupBySeries ? t("content.listView") : t("content.groupedView")}
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
            <option key={s} value={s}>{s ? t(`movie.statuses.${s}`) : t("content.allStatuses")}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto text-sm">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value)} className="input w-auto text-sm">
          <option value="desc">{t("content.sortDesc")}</option>
          <option value="asc">{t("content.sortAsc")}</option>
        </select>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <select value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.allGenres")}</option>
          {(options?.genres ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterTag} onChange={(e) => { setFilterTag(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.allTags")}</option>
          {(options?.tags ?? []).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select value={director} onChange={(e) => { setDirector(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.allDirectors")}</option>
          {(options?.directors ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={studio} onChange={(e) => { setStudio(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.allStudios")}</option>
          {(options?.studios ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={distributor} onChange={(e) => { setDistributor(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.allDistributors")}</option>
          {(options?.distributors ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">{t("content.filterMinRating")}</option>
          {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}+</option>)}
        </select>
        {(genre || filterTag || director || studio || distributor || minRating) && (
          <button onClick={() => { setGenre(""); setFilterTag(""); setDirector(""); setStudio(""); setDistributor(""); setMinRating(""); setPage(1); }} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            {t("content.filterClear")}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      ) : groupBySeries ? (
        <div className="space-y-2">
          {Array.from(seriesGroups.entries()).map(([seriesKey, movies]) => {
            if (seriesKey === "__none__") {
              return movies.map((movie) => <MovieRow key={movie.id} movie={movie} onEdit={setEditing} onDelete={handleDelete} t={t} />);
            }
            const isExpanded = expandedSeries.has(seriesKey);
            return (
              <div key={seriesKey}>
                <button
                  onClick={() => toggleSeries(seriesKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <CoverImage src={movies[0]?.coverImageUrl} alt={seriesKey} className="w-8 h-11" />
                  <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span className="text-sm font-semibold flex-1 text-gray-800 dark:text-gray-200">{seriesKey}</span>
                  <span className="text-xs text-gray-400">{t("content.works", { n: movies.length })}</span>
                </button>
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {movies.map((movie) => <MovieRow key={movie.id} movie={movie} onEdit={setEditing} onDelete={handleDelete} t={t} />)}
                  </div>
                )}
              </div>
            );
          })}
          {(data?.data ?? []).length === 0 && <p className="text-sm text-gray-400 py-8 text-center">{t("content.noMoviesRegistered")}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((movie) => (
            <MovieRow key={movie.id} movie={movie} onEdit={setEditing} onDelete={handleDelete} t={t} />
          ))}
          {(data?.data?.length ?? 0) === 0 && <p className="text-sm text-gray-400 py-8 text-center">{t("content.noMoviesRegistered")}</p>}
        </div>
      )}

      {data && !groupBySeries && <Pagination page={page} total={data.total} perPage={data.perPage} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("content.addMovie")} size="lg">
        <MovieForm onSubmit={(d) => createMutation.mutate(d)} onCancel={() => setModalOpen(false)} loading={createMutation.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={t("content.editMovie")} size="lg">
        {editing && <MovieForm initial={editing} onSubmit={(d) => updateMutation.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} loading={updateMutation.isPending} />}
      </Modal>
    </div>
  );
}

function MovieRow({ movie, onEdit, onDelete, t }: { movie: Movie; onEdit: (m: Movie) => void; onDelete: (m: Movie) => void; t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <CoverImage src={movie.coverImageUrl} alt={movie.title} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{movie.title}</p>
            {movie.seriesName && <p className="text-xs text-gray-500">{movie.seriesName}{movie.seriesOrder ? ` #${movie.seriesOrder}` : ""}</p>}
            {movie.directors.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{movie.directors.join(", ")}</p>}
          </div>
          <StatusBadge status={movie.status} category="movie" />
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <StarRating value={movie.rating} readonly />
          {movie.tags.map((tag) => <TagBadge key={tag} name={tag} />)}
          {movie.mediaTypes.map((m) => <span key={m} className="text-xs text-gray-400">{m}</span>)}
        </div>
        {movie.sharedRatings && movie.sharedRatings.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {movie.sharedRatings.map((sr) => (
              <div key={sr.username} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{sr.username}</span>
                <StarRating value={sr.rating} readonly />
              </div>
            ))}
          </div>
        )}
        {movie.memo && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{movie.memo}</p>}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={() => onEdit(movie)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{t("common.edit")}</button>
        <button onClick={() => onDelete(movie)} className="text-xs text-red-400 hover:text-red-600">{t("common.delete")}</button>
      </div>
    </div>
  );
}
