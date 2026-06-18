import { api } from "./apiClient";
import type { Book, BookCreateInput, Movie, MovieCreateInput, Drama, DramaCreateInput } from "@kakera/shared";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface BookMeta {
  googleBooksId: string;
  title: string;
  authors: string[];
  publisher?: string;
  isbn?: string;
  coverImageUrl?: string;
}

export interface ContentMeta {
  tmdbId: number;
  title: string;
  coverImageUrl?: string;
  releasedAt?: string;
}

export const authApi = {
  login: (username: string, password: string, totpCode?: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: { id: string; username: string; email: string; role: string } }>(
      "/auth/login", { username, password, totpCode }
    ),
};

export const booksApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Book>>("/books", p),
  create: (data: BookCreateInput) => api.post<Book>("/books", data),
  update: (id: string, data: Partial<BookCreateInput>) => api.put<Book>(`/books/${id}`, data),
  delete: (id: string) => api.delete(`/books/${id}`),
  searchMeta: (q: string) => api.get<BookMeta[]>("/metadata/books", { q }),
  lookupISBN: (isbn: string) => api.get<BookMeta>(`/metadata/barcode/${isbn}`),
};

export const moviesApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Movie>>("/movies", p),
  create: (data: MovieCreateInput) => api.post<Movie>("/movies", data),
  update: (id: string, data: Partial<MovieCreateInput>) => api.put<Movie>(`/movies/${id}`, data),
  delete: (id: string) => api.delete(`/movies/${id}`),
  searchMeta: (q: string) => api.get<ContentMeta[]>("/metadata/movies", { q }),
};

export const dramasApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Drama>>("/dramas", p),
  create: (data: DramaCreateInput) => api.post<Drama>("/dramas", data),
  update: (id: string, data: Partial<DramaCreateInput>) => api.put<Drama>(`/dramas/${id}`, data),
  delete: (id: string) => api.delete(`/dramas/${id}`),
  searchMeta: (q: string) => api.get<ContentMeta[]>("/metadata/dramas", { q }),
};

export const mediaTypesApi = {
  list: () => api.get<{ id: string; category: string; name: string; isDefault: boolean }[]>("/media-types"),
  create: (category: string, name: string) => api.post("/media-types", { category, name }),
  delete: (id: string) => api.delete(`/media-types/${id}`),
};

export const dashboardApi = {
  getStats: () =>
    api.get<{
      books: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
      movies: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
      dramas: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number> };
    }>("/dashboard/stats"),
};
