import { ImageOff } from "lucide-react";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function CoverImage({ src, alt, className = "w-12 h-16" }: Props) {
  if (!src) {
    return (
      <div className={`${className} rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0`}>
        <ImageOff size={16} className="text-gray-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded object-cover flex-shrink-0`}
      loading="lazy"
    />
  );
}
