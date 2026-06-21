import { apiClient } from "../apiClient";
import type { Tag, UserMediaType, DashboardStats } from "@kakera/shared";

export type CategorySummary = { added: number; updated: number; skipped: number };
export type ImportResult = { books: CategorySummary; movies: CategorySummary; dramas: CategorySummary };

export const tagsApi = {
  list: () => apiClient.get<Tag[]>("/tags").then((r) => r.data),
  create: (name: string, color?: string) =>
    apiClient.post<Tag>("/tags", { name, color }).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/tags/${id}`),
};

export const mediaTypesApi = {
  list: () => apiClient.get<UserMediaType[]>("/media-types").then((r) => r.data),
  create: (category: string, name: string) =>
    apiClient.post<UserMediaType>("/media-types", { category, name }).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/media-types/${id}`),
};

export interface DashboardFilter {
  period?: "all" | "yearly" | "monthly";
  year?: number;
  month?: number;
}

function filterParams(f: DashboardFilter): string {
  const p = new URLSearchParams();
  if (f.period) p.set("period", f.period);
  if (f.year) p.set("year", String(f.year));
  if (f.month) p.set("month", String(f.month));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const dashboardApi = {
  getStats: (f: DashboardFilter = {}) =>
    apiClient.get<DashboardStats>(`/dashboard/stats${filterParams(f)}`).then((r) => r.data),
  getUserStats: (username: string, f: DashboardFilter = {}) =>
    apiClient.get<DashboardStats>(`/dashboard/stats/${encodeURIComponent(username)}${filterParams(f)}`).then((r) => r.data),
};

export interface ShareTarget { userId: string; username: string }
export interface RatingShareEntry { toUserId: string; toUsername: string; enabled: boolean }
export interface ReceivedShares {
  dashboardOwners: ShareTarget[];
  ratingSharers: ShareTarget[];
}

export const sharingApi = {
  listDashboardShares: () =>
    apiClient.get<ShareTarget[]>("/sharing/dashboard").then((r) => r.data),
  setDashboardShare: (targetUserId: string) =>
    apiClient.post(`/sharing/dashboard/${targetUserId}`),
  removeDashboardShare: (targetUserId: string) =>
    apiClient.delete(`/sharing/dashboard/${targetUserId}`),
  listRatingShares: () =>
    apiClient.get<RatingShareEntry[]>("/sharing/ratings").then((r) => r.data),
  setRatingShare: (targetUserId: string, enabled: boolean) =>
    apiClient.post(`/sharing/ratings/${targetUserId}`, { enabled }),
  removeRatingShare: (targetUserId: string) =>
    apiClient.delete(`/sharing/ratings/${targetUserId}`),
  listReceivedShares: () =>
    apiClient.get<ReceivedShares>("/sharing/received").then((r) => r.data),
};

export interface BackupConfig { enabled: boolean; intervalDays: number; maxBackups: number }

export const backupApi = {
  getConfig: () => apiClient.get<BackupConfig>("/admin/backup/config").then((r) => r.data),
  updateConfig: (cfg: BackupConfig) =>
    apiClient.put<BackupConfig>("/admin/backup/config", cfg).then((r) => r.data),
  list: () => apiClient.get<string[]>("/admin/backup/list").then((r) => r.data),
  run: () => apiClient.post<{ filename: string }>("/admin/backup/run").then((r) => r.data),
  restore: (filename: string) => apiClient.post(`/admin/backup/restore/${filename}`),
};

export const exportImportApi = {
  exportData: async () => {
    const res = await apiClient.get("/export", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kakera-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importData: (file: File, mode: "merge-skip" | "merge-overwrite" | "replace") => {
    const form = new FormData();
    form.append("file", file);
    // Set Content-Type to undefined so axios doesn't override with application/json,
    // allowing the browser to set multipart/form-data with the correct boundary.
    return apiClient.post<ImportResult>(`/import?mode=${mode}`, form, {
      headers: { "Content-Type": undefined },
    });
  },
};

export const usersApi = {
  list: () => apiClient.get<{ id: string; username: string; email: string; role: string }[]>("/users").then((r) => r.data),
  create: (data: { username: string; email: string; password: string; role?: string }) =>
    apiClient.post("/users", data).then((r) => r.data),
  update: (id: string, data: { email?: string; avatarUrl?: string; password?: string }) =>
    apiClient.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};
