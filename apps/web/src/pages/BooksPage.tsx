import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Layers, List } from "lucide-react";
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

export default function BooksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [groupBySeries, setGroupBySeries] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["books", { search, status, page }],
    queryFn: () => booksApi.list({ search: search || undefined, status: status || undefined, page, perPage: 20 }),
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
    return groups;
  }, [data?.data]);

  const handleDelete = (book: Book) => {
    if (confirm(`「${book.title}」を削除しますか？`)) deleteMutation.mutate(book.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("nav.books")}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupBySeries((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${groupBySeries ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            title="シリーズでグループ表示"
          >
            {groupBySeries ? <List size={15} /> : <Layers size={15} />}
            {groupBySeries ? "一覧表示" : "シリーズ別"}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t("common.add")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-auto text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? t(`book.statuses.${s}`) : "すべてのステータス"}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-gray-400">{t("common.loading")}</p>
      ) : groupBySeries ? (
        <div className="space-y-4">
          {Array.from(seriesGroups.entries()).map(([seriesKey, books]) => (
            <div key={seriesKey}>
              {seriesKey !== "__none__" && (
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <Layers size={14} /> {seriesKey}
                  <span className="text-xs font-normal text-gray-400">({books.length}冊)</span>
                </h3>
              )}
              <div className="space-y-2">
                {books.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)).map((book) => (
                  <BookRow key={book.id} book={book} onEdit={setEditing} onDelete={handleDelete} t={t} />
                ))}
              </div>
            </div>
          ))}
          {(data?.data ?? []).length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">登録された本がありません</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((book) => (
            <BookRow key={book.id} book={book} onEdit={setEditing} onDelete={handleDelete} t={t} />
          ))}
          {data?.data.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">登録された本がありません</p>
          )}
        </div>
      )}

      {data && <Pagination page={page} total={data.total} perPage={data.perPage} onChange={setPage} />}

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="本を追加" size="lg">
        <BookForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="本を編集" size="lg">
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
