import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Book, BookCreateInput } from "@kakera/shared";
import { booksApi } from "../../lib/api/books";
import { mediaTypesApi } from "../../lib/api/misc";
import StarRating from "../ui/StarRating";
import TagBadge from "../ui/TagBadge";

interface Props {
  initial?: Partial<Book>;
  onSubmit: (data: BookCreateInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

const STATUSES = ["want_to_read", "reading", "completed", "on_hold"] as const;

export default function BookForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [seriesOrder, setSeriesOrder] = useState(initial?.seriesOrder?.toString() ?? "");
  const [authors, setAuthors] = useState(initial?.authors?.join(", ") ?? "");
  const [isbn, setIsbn] = useState(initial?.isbn ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "want_to_read");
  const [mediaTypes, setMediaTypes] = useState<string[]>(initial?.mediaTypes ?? []);
  const [purchasePlace, setPurchasePlace] = useState(initial?.purchasePlace ?? "");
  const [startedAt, setStartedAt] = useState(initial?.startedAt ?? "");
  const [completedAt, setCompletedAt] = useState(initial?.completedAt ?? "");
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [googleBooksId, setGoogleBooksId] = useState(initial?.googleBooksId ?? "");
  const [metaSearch, setMetaSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [metaResults, setMetaResults] = useState<Awaited<ReturnType<typeof booksApi.searchMeta>>>([]);

  const { data: allMediaTypes } = useQuery({
    queryKey: ["mediaTypes"],
    queryFn: mediaTypesApi.list,
  });
  const bookMediaTypes = allMediaTypes?.filter((m) => m.category === "book") ?? [];

  const handleMetaSearch = async () => {
    if (!metaSearch.trim()) return;
    setSearching(true);
    try {
      const results = await booksApi.searchMeta(metaSearch);
      setMetaResults(results ?? []);
    } finally {
      setSearching(false);
    }
  };

  const applyMeta = (meta: (typeof metaResults)[0]) => {
    setTitle(meta.title);
    setAuthors(meta.authors.join(", "));
    if (meta.publisher) setPublisher(meta.publisher);
    if (meta.isbn) setIsbn(meta.isbn);
    if (meta.coverImageUrl) setCoverImageUrl(meta.coverImageUrl);
    setGoogleBooksId(meta.googleBooksId);
    setMetaResults([]);
    setMetaSearch("");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      seriesName: seriesName || undefined,
      seriesOrder: seriesOrder ? parseInt(seriesOrder) : undefined,
      authors: authors.split(",").map((a) => a.trim()).filter(Boolean),
      isbn: isbn || undefined,
      publisher: publisher || undefined,
      coverImageUrl: coverImageUrl || undefined,
      status: status as BookCreateInput["status"],
      mediaTypes,
      purchasePlace: purchasePlace || undefined,
      startedAt: startedAt || undefined,
      completedAt: completedAt || undefined,
      rating,
      tags,
      memo: memo || undefined,
      googleBooksId: googleBooksId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Metadata search */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">メタデータ検索</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={metaSearch}
            onChange={(e) => setMetaSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMetaSearch())}
            placeholder="タイトルや著者で検索..."
            className="input flex-1 text-sm"
          />
          <button type="button" onClick={handleMetaSearch} disabled={searching} className="btn-secondary px-3">
            <Search size={15} />
          </button>
        </div>
        {metaResults.length > 0 && (
          <ul className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {metaResults.map((m) => (
              <li key={m.googleBooksId}>
                <button
                  type="button"
                  onClick={() => applyMeta(m)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex gap-3 items-center"
                >
                  {m.coverImageUrl && <img src={m.coverImageUrl} alt="" className="w-8 h-10 object-cover rounded" />}
                  <span>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-gray-400">{m.authors.join(", ")}</p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="form-label">{t("book.title")} *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.seriesName")}</label>
          <input value={seriesName} onChange={(e) => setSeriesName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">巻数</label>
          <input type="number" min={1} value={seriesOrder} onChange={(e) => setSeriesOrder(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">{t("book.authors")}</label>
          <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="カンマ区切りで複数入力" className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.isbn")}</label>
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.publisher")}</label>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="form-label">カバー画像URL</label>
          <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.status")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`book.statuses.${s}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">{t("book.purchasePlace")}</label>
          <input value={purchasePlace} onChange={(e) => setPurchasePlace(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.startedAt")}</label>
          <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="form-label">{t("book.completedAt")}</label>
          <input type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} className="input" />
        </div>
      </div>

      {/* Media types */}
      <div>
        <label className="form-label">{t("book.mediaTypes")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {bookMediaTypes.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mediaTypes.includes(m.name)}
                onChange={(e) =>
                  setMediaTypes(e.target.checked ? [...mediaTypes, m.name] : mediaTypes.filter((x) => x !== m.name))
                }
                className="rounded"
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="form-label">{t("book.rating")}</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      {/* Tags */}
      <div>
        <label className="form-label">タグ</label>
        <div className="flex gap-2 mb-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="タグを入力してEnter"
            className="input flex-1"
          />
          <button type="button" onClick={addTag} className="btn-secondary px-3 text-sm">追加</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <TagBadge key={tag} name={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))} />
          ))}
        </div>
      </div>

      {/* Memo */}
      <div>
        <label className="form-label">{t("book.memo")}</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className="input resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">{t("common.cancel")}</button>
        <button type="submit" disabled={loading} className="btn-primary">{t("common.save")}</button>
      </div>
    </form>
  );
}
