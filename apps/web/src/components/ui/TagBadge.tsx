import { X } from "lucide-react";

interface Props {
  name: string;
  onRemove?: () => void;
}

export default function TagBadge({ name, onRemove }: Props) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
      {name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-red-500">
          <X size={10} />
        </button>
      )}
    </span>
  );
}
