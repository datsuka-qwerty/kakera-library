const LABELS: Record<string, { ja: string; en: string }> = {
  paper_book: { ja: "紙媒体", en: "Physical Book" },
  ebook:      { ja: "電子書籍", en: "E-Book" },
  library:    { ja: "図書館", en: "Library" },
  borrowed:   { ja: "貸出中", en: "Borrowed" },
  sold:       { ja: "手放した", en: "Sold / Given Away" },
  theater:    { ja: "映画館", en: "Theater" },
  tv:         { ja: "テレビ", en: "TV" },
};

export function getMediaTypeName(mt: { name: string; key?: string | null }, lang: string): string {
  if (mt.key && LABELS[mt.key]) {
    return LABELS[mt.key][lang as "ja" | "en"] ?? mt.name;
  }
  return mt.name;
}
