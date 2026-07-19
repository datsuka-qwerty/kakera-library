import axios from "axios";
import { api } from "./apiClient";
import { useAuthStore } from "../store/authStore";
import type { Book, BookCreateInput, Movie, MovieCreateInput, Drama, DramaCreateInput, Anime, AnimeCreateInput } from "@kakera/shared";

export type CategorySummary = { added: number; updated: number; skipped: number };
export type ImportResult = { books: CategorySummary; movies: CategorySummary; dramas: CategorySummary };

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListParams {
  search?: string;
  status?: string;
  genre?: string;
  tag?: string;
  rating?: number;
  page?: number;
  perPage?: number;
  sort?: string;
  order?: string;
}

export interface BookMeta {
  googleBooksId: string;
  title: string;
  authors: string[];
  publisher?: string;
  isbn?: string;
  coverImageUrl?: string;
  genres?: string[];
  publishedAt?: string;
}

export interface ContentMeta {
  tmdbId: number;
  title: string;
  coverImageUrl?: string;
  releasedAt?: string;
  genres?: string[];
  totalSeasons?: number;
  studios?: string[];
  directors?: string[];
}

export const setupApi = {
  getStatus: () => api.get<{ needsSetup: boolean }>("/setup"),
  createAdmin: (data: { username: string; password: string }) =>
    api.post<{ id: string; username: string }>("/setup", data),
};

export const authApi = {
  login: (username: string, password: string, totpCode?: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: { id: string; username: string; role: string } }>(
      "/auth/login", { username, password, totpCode }
    ),
  register: (data: { username: string; password: string }) =>
    api.post<{ accessToken: string; refreshToken: string; user: { id: string; username: string; role: string } }>(
      "/auth/register", data
    ),
};

export const serverSettingsApi = {
  get: () => api.get<{ registrationEnabled: boolean }>("/server-settings"),
  update: (data: { registrationEnabled: boolean }) =>
    api.put<{ registrationEnabled: boolean }>("/server-settings", data),
};

export const booksApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Book>>("/books", p),
  create: (data: BookCreateInput) => api.post<Book>("/books", data),
  update: (id: string, data: Partial<BookCreateInput>) => api.put<Book>(`/books/${id}`, data),
  delete: (id: string) => api.delete(`/books/${id}`),
  searchMeta: (q: string, page = 1) => api.get<BookMeta[]>("/metadata/books", { q, page }),
  lookupISBN: (isbn: string) => api.get<BookMeta>(`/metadata/barcode/${isbn}`),
};

export const moviesApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Movie>>("/movies", p),
  create: (data: MovieCreateInput) => api.post<Movie>("/movies", data),
  update: (id: string, data: Partial<MovieCreateInput>) => api.put<Movie>(`/movies/${id}`, data),
  delete: (id: string) => api.delete(`/movies/${id}`),
  searchMeta: (q: string, page = 1) => api.get<ContentMeta[]>("/metadata/movies", { q, page }),
};

export const dramasApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Drama>>("/dramas", p),
  create: (data: DramaCreateInput) => api.post<Drama>("/dramas", data),
  update: (id: string, data: Partial<DramaCreateInput>) => api.put<Drama>(`/dramas/${id}`, data),
  delete: (id: string) => api.delete(`/dramas/${id}`),
  searchMeta: (q: string, page = 1) => api.get<ContentMeta[]>("/metadata/dramas", { q, page }),
};

export const animesApi = {
  list: (p: ListParams) => api.get<PaginatedResult<Anime>>("/animes", p),
  create: (data: AnimeCreateInput) => api.post<Anime>("/animes", data),
  update: (id: string, data: Partial<AnimeCreateInput>) => api.put<Anime>(`/animes/${id}`, data),
  delete: (id: string) => api.delete(`/animes/${id}`),
  searchMeta: (q: string, page = 1) => api.get<ContentMeta[]>("/metadata/animes", { q, page }),
};

export const mediaTypesApi = {
  list: () => api.get<{ id: string; category: string; name: string; isDefault: boolean; key?: string }[]>("/media-types"),
  create: (category: string, name: string) => api.post("/media-types", { category, name }),
  delete: (id: string) => api.delete(`/media-types/${id}`),
};

export type DashStats = {
  books: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number>; byGenre: Record<string, number> };
  movies: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number>; byGenre: Record<string, number> };
  dramas: { total: number; byStatus: Record<string, number>; byMonth: Record<string, number>; byGenre: Record<string, number> };
};

export interface DashboardFilter {
  period?: "all" | "yearly" | "monthly";
  year?: number;
  month?: number;
}

function filterParams(f: DashboardFilter): string {
  const p: string[] = [];
  if (f.period) p.push(`period=${f.period}`);
  if (f.year) p.push(`year=${f.year}`);
  if (f.month) p.push(`month=${f.month}`);
  return p.length ? `?${p.join("&")}` : "";
}

export const dashboardApi = {
  getStats: (f: DashboardFilter = {}) => api.get<DashStats>(`/dashboard/stats${filterParams(f)}`),
  getUserStats: (username: string, f: DashboardFilter = {}) =>
    api.get<DashStats>(`/dashboard/stats/${encodeURIComponent(username)}${filterParams(f)}`),
};

export const exportImportApi = {
  getExportData: async (): Promise<{ json: string; filename: string }> => {
    const { serverUrl, accessToken } = useAuthStore.getState();
    const res = await axios.get(`${serverUrl}/api/v1/export`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const date = new Date().toISOString().slice(0, 10);
    return {
      json: JSON.stringify(res.data, null, 2),
      filename: `kakera-export-${date}.json`,
    };
  },

  importData: async (jsonText: string, mode: "merge-skip" | "merge-overwrite" | "replace"): Promise<ImportResult> => {
    const { serverUrl, accessToken } = useAuthStore.getState();
    // Parse first to validate JSON
    JSON.parse(jsonText);
    const blob = new Blob([jsonText], { type: "application/json" });
    const formData = new FormData();
    formData.append("file", blob as any, "import.json");
    const res = await axios.post<ImportResult>(
      `${serverUrl}/api/v1/import?mode=${mode}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  },
};
