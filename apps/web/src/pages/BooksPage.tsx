import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Layers, List, Share2, ChevronRight } from "lucide-react";
import ShareModal from "../components/ui/ShareModal";
import type { Book, BookCreateInput } from "@kakera/shared";
import { booksApi } from "../lib/api/books";
import SearchBar from "../components/ui/SearchBar";
import StatusBadge from "../components/ui/StatusBadge";
import StarRating from "../components/ui/StarRating";
import TagBadge from "../components/ui/TagBadge";
import CoverImage from "../components/ui/CoverImage";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import BookForm from "../components/books/BookForm";

const STATUSES = ["", "want_to_read", "reading", "completed", "on_hold"];
const SORT_OPTIONS = [
  { value: "created_at", labelKey: "content.sortCreatedAt" },
  { value: "published_at", labelKey: "content.sortPublishedAt" },
  { value: "title", labelKey: "content.sortTitle" },
  { value: "rating", labelKey: "content.sortRating" },
];

export default function BooksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["books", { search, status, page: groupBySeries ? 1 : page, sort, order }],
    queryFn: () => booksApi.list({
      search: search || undefined,
      status: status || undefined,
      page: groupBySeries ? 1 : page,
      perPage: groupBySeries ? 500 : 20,
      sort,
      order,
    }),
  });

  const createMutation = useMutation({
    mutationFn: booksApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["books"] }); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BookCreateInput> }) => booksApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["books"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: booksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books"] }),
  });

  const toggleSeries = (key: string) =>
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleCreate = (data: BookCreateInput) => createMutation.mutate(data);
  const handleUpdate = (data: BookCreateInput) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
  };
  const seriesGroups = useMemo(() => {
    const books = data?.data ?? [];
    const groups = new Map<string, Book[]>();
    books.forEach((b) => {
      const key = b.seriesName ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    groups.forEach((items) => items.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)));
    return groups;
  }, [data?.data]);

  const handleDelete = (book: Book) => {
    if (confirm(t("content.deleteConfirm", { title: book.title }))) deleteMutation.mutate(book.id);
  };

  return (
    <div className="space-y-4">
      {shareOpen && <ShareModal type="rating" onClose={() => setShareOpen(false)} />}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t("nav.books")}</h2>
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
            title={t("content.groupedViewTitle")}
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
            <option key={s} value={s}>{s ? t(`book.statuses.${s}`) : t("content.allStatuses")}</option>
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

      {isLoading ? (
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      ) : groupBySeries ? (
        <div className="space-y-2">
          {Array.from(seriesGroups.entries()).map(([seriesKey, books]) => {
            if (seriesKey === "__none__") {
              return books.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)).map((book) => (
                <BookRow key={book.id} book={book} onEdit={setEditing} onDelete={handleDelete} t={t} />
              ));
            }
            const isExpanded = expandedSeries.has(seriesKey);
            return (
              <div key={seriesKey}>
                <button
                  onClick={() => toggleSeries(seriesKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <CoverImage src={books[0]?.coverImageUrl} alt={seriesKey} className="w-8 h-11" />
                  <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span className="text-sm font-semibold flex-1 text-gray-800 dark:text-gray-200">{seriesKey}</span>
                  <span className="text-xs text-gray-400">{t("content.volumes", { n: books.length })}</span>
                </button>
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {books.map((book) => (
                      <BookRow key={book.id} book={book} onEdit={setEditing} onDelete={handleDelete} t={t} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {(data?.data ?? []).length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">{t("content.noBooksRegistered")}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((book) => (
            <BookRow key={book.id} book={book} onEdit={setEditing} onDelete={handleDelete} t={t} />
          ))}
          {(data?.data?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">{t("content.noBooksRegistered")}</p>
          )}
        </div>
      )}

      {data && !groupBySeries && <Pagination page={page} total={data.total} perPage={data.perPage} onChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("content.addBook")} size="lg">
        <BookForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t("content.editBook")} size="lg">
        {editing && (
          <BookForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function BookRow({ book, onEdit, onDelete, t }: { book: Book; onEdit: (b: Book) => void; onDelete: (b: Book) => void; t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-surface-elevated-light dark:bg-surface-elevated-dark border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <CoverImage src={book.coverImageUrl} alt={book.title} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm leading-snug">{book.title}</p>
            {book.seriesName && (
              <p className="text-xs text-gray-500">{book.seriesName}{book.seriesOrder ? ` #${book.seriesOrder}` : ""}</p>
            )}
            {book.authors.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{book.authors.join(", ")}</p>
            )}
          </div>
          <StatusBadge status={book.status} category="book" />
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <StarRating value={book.rating} readonly />
          {book.tags.map((tag) => <TagBadge key={tag} name={tag} />)}
          {book.mediaTypes.map((m) => (
            <span key={m} className="text-xs text-gray-400">{m}</span>
          ))}
        </div>
        {book.sharedRatings && book.sharedRatings.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {book.sharedRatings.map((sr) => (
              <div key={sr.username} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{sr.username}</span>
                <StarRating value={sr.rating} readonly />
              </div>
            ))}
          </div>
        )}
        {book.memo && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{book.memo}</p>}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={() => onEdit(book)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          {t("common.edit")}
        </button>
        <button onClick={() => onDelete(book)} className="text-xs text-red-400 hover:text-red-600">
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}
