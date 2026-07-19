import { apiClient } from "../apiClient";
import type { Anime, AnimeCreateInput } from "@kakera/shared";
import type { ContentMeta } from "./movies";

export interface AnimeListParams {
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

export interface PaginatedAnimes {
  data: Anime[];
  total: number;
  page: number;
  perPage: number;
}

export const animesApi = {
  list: (params: AnimeListParams) =>
    apiClient.get<PaginatedAnimes>("/animes", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Anime>(`/animes/${id}`).then((r) => r.data),
  create: (data: AnimeCreateInput) =>
    apiClient.post<Anime>("/animes", data).then((r) => r.data),
  update: (id: string, data: Partial<AnimeCreateInput>) =>
    apiClient.put<Anime>(`/animes/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/animes/${id}`),
  searchMeta: (q: string, page = 1) =>
    apiClient.get<ContentMeta[]>("/metadata/animes", { params: { q, page } }).then((r) => r.data),
};
