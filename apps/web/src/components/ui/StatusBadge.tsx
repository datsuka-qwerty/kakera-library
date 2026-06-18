import clsx from "clsx";
import { useTranslation } from "react-i18next";

const colorMap: Record<string, string> = {
  // Books
  want_to_read: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reading: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  // Movies
  unwatched: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  watched: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  // Dramas
  interested: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  watching: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  dropped: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface Props {
  status: string;
  category: "book" | "movie" | "drama";
}

export default function StatusBadge({ status, category }: Props) {
  const { t } = useTranslation();
  const key = `${category}.statuses.${status}`;
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", colorMap[status] ?? "bg-gray-100 text-gray-600")}>
      {t(key)}
    </span>
  );
}
