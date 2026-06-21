import type { SharedRating } from "./common";

export type BookStatus = "want_to_read" | "reading" | "completed" | "on_hold";

export type BookMediaType = string; // user-extensible: "physical" | "ebook" | "library" | "lending" | "sold" | ...

export interface Book {
  id: string;
  userId: string;
  title: string;
  seriesName?: string;
  seriesOrder?: number;
  authors: string[];
  isbn?: string;
  publisher?: string;
  coverImageUrl?: string;
  status: BookStatus;
  mediaTypes: BookMediaType[];
  purchasePlace?: string;
  startedAt?: string;
  completedAt?: string;
  rating?: number; // 1-5
  tags: string[];
  genres: string[];
  memo?: string;
  googleBooksId?: string;
  createdAt: string;
  updatedAt: string;
  sharedRatings?: SharedRating[];
}

export interface BookCreateInput {
  title: string;
  seriesName?: string;
  seriesOrder?: number;
  authors?: string[];
  isbn?: string;
  publisher?: string;
  coverImageUrl?: string;
  status: BookStatus;
  mediaTypes: BookMediaType[];
  genres?: string[];
  purchasePlace?: string;
  startedAt?: string;
  completedAt?: string;
  rating?: number;
  tags?: string[];
  memo?: string;
  googleBooksId?: string;
}

export type BookUpdateInput = Partial<BookCreateInput>;
