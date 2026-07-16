import { apiClient } from "../apiClient";
import type { Movie, MovieCreateInput } from "@kakera/shared";

export interface MovieListParams {
  search?: string;
  status?: string;
  rating?: number;
  page?: number;
  perPage?: number;
}

export interface PaginatedMovies {
  data: Movie[];
  total: number;
  page: number;
  perPage: number;
}

export interface ContentMeta {
  tmdbId: number;
  title: string;
  coverImageUrl?: string;
  releasedAt?: string;
  overview?: string;
  genres?: string[];
  totalSeasons?: number;
}

export const moviesApi = {
  list: (params: MovieListParams) =>
    apiClient.get<PaginatedMovies>("/movies", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Movie>(`/movies/${id}`).then((r) => r.data),
  create: (data: MovieCreateInput) =>
    apiClient.post<Movie>("/movies", data).then((r) => r.data),
  update: (id: string, data: Partial<MovieCreateInput>) =>
    apiClient.put<Movie>(`/movies/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/movies/${id}`),
  searchMeta: (q: string, page = 1) =>
    apiClient.get<ContentMeta[]>("/metadata/movies", { params: { q, page } }).then((r) => r.data),
};
