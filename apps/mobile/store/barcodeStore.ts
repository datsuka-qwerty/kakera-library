import { create } from "zustand";

export interface ScannedBook {
  isbn: string;
  title: string;
  authors: string[];
  coverImageUrl?: string;
  publisher?: string;
  googleBooksId?: string;
  status: "want_to_read" | "reading" | "completed" | "on_hold";
  rating?: number;
  memo: string;
  tags: string[];
  mediaTypes: string[];
}

interface BarcodeState {
  scannedBooks: ScannedBook[];
  addBook: (book: ScannedBook) => void;
  updateBook: (isbn: string, updates: Partial<ScannedBook>) => void;
  removeBook: (isbn: string) => void;
  clear: () => void;
}

export const useBarcodeStore = create<BarcodeState>((set) => ({
  scannedBooks: [],
  addBook: (book) =>
    set((s) => ({
      scannedBooks: s.scannedBooks.some((b) => b.isbn === book.isbn)
        ? s.scannedBooks
        : [...s.scannedBooks, book],
    })),
  updateBook: (isbn, updates) =>
    set((s) => ({
      scannedBooks: s.scannedBooks.map((b) =>
        b.isbn === isbn ? { ...b, ...updates } : b
      ),
    })),
  removeBook: (isbn) =>
    set((s) => ({ scannedBooks: s.scannedBooks.filter((b) => b.isbn !== isbn) })),
  clear: () => set({ scannedBooks: [] }),
}));
