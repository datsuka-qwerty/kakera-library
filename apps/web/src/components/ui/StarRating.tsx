import { Star } from "lucide-react";
import clsx from "clsx";

interface Props {
  value?: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}

export default function StarRating({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={clsx("focus:outline-none", readonly ? "cursor-default" : "cursor-pointer")}
        >
          <Star
            size={16}
            className={clsx(
              n <= (value ?? 0)
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            )}
          />
        </button>
      ))}
    </div>
  );
}
