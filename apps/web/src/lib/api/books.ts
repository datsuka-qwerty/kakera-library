import { apiClient } from "../apiClient";
import type { Book, BookCreateInput } from "@kakera/shared";

export interface BookListParams {
  search?: string;
  status?: string;
  rating?: number;
  page?: number;
  perPage?: number;
  sort?: string;
  order?: string;
}

export interface PaginatedBooks {
  data: Book[];
  total: number;
  page: number;
  perPage: number;
}

export interface BookMeta {
  googleBooksId: string;
  title: string;
  authors: string[];
  publisher?: string;
  isbn?: string;
  coverImageUrl?: string;
  description?: string;
  genres?: string[];
  publishedAt?: string;
}

export const booksApi = {
  list: (params: BookListParams) =>
    apiClient.get<PaginatedBooks>("/books", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Book>(`/books/${id}`).then((r) => r.data),
  create: (data: BookCreateInput) =>
    apiClient.post<Book>("/books", data).then((r) => r.data),
  update: (id: string, data: Partial<BookCreateInput>) =>
    apiClient.put<Book>(`/books/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/books/${id}`),
  searchMeta: (q: string, page = 1) =>
    apiClient.get<BookMeta[]>("/metadata/books", { params: { q, page } }).then((r) => r.data),
  lookupBarcode: (isbn: string) =>
    apiClient.get<BookMeta>(`/metadata/barcode/${isbn}`).then((r) => r.data),
};
