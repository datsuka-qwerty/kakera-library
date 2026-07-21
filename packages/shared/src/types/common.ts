export interface SharedRating {
  username: string;
  rating: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
}

export interface UserMediaType {
  id: string;
  category: "book" | "movie" | "drama" | "anime";
  name: string;
  isDefault: boolean;
  key?: string;
}

export interface BackupConfig {
  enabled: boolean;
  intervalDays: number;
  maxBackups: number;
}

export interface DashboardStats {
  books: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
    byGenre: Record<string, number>;
  };
  movies: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
    byGenre: Record<string, number>;
  };
  dramas: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
    byGenre: Record<string, number>;
  };
  animes: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
    byGenre: Record<string, number>;
  };
}
