import { apiClient } from "../apiClient";
import type { Drama, DramaCreateInput } from "@kakera/shared";
import type { ContentMeta } from "./movies";

export interface DramaListParams {
  search?: string;
  status?: string;
  rating?: number;
  page?: number;
  perPage?: number;
}

export interface PaginatedDramas {
  data: Drama[];
  total: number;
  page: number;
  perPage: number;
}

export const dramasApi = {
  list: (params: DramaListParams) =>
    apiClient.get<PaginatedDramas>("/dramas", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Drama>(`/dramas/${id}`).then((r) => r.data),
  create: (data: DramaCreateInput) =>
    apiClient.post<Drama>("/dramas", data).then((r) => r.data),
  update: (id: string, data: Partial<DramaCreateInput>) =>
    apiClient.put<Drama>(`/dramas/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/dramas/${id}`),
  searchMeta: (q: string) =>
    apiClient.get<ContentMeta[]>("/metadata/dramas", { params: { q } }).then((r) => r.data),
};
