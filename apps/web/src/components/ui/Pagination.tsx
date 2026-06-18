import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface Props {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, perPage, onChange }: Props) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 justify-center">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => Math.abs(p - page) <= 2)
        .map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={clsx(
              "w-8 h-8 rounded text-sm",
              p === page
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            {p}
          </button>
        ))}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
