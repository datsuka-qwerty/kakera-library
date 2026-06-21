import type { SharedRating } from "./common";

export type DramaStatus =
  | "interested"
  | "watching"
  | "completed"
  | "dropped";

export type DramaMediaType = string; // user-extensible: "netflix" | "amazon_prime" | "fod" | "u_next" | "tv" | ...

export interface Drama {
  id: string;
  userId: string;
  title: string;
  seriesName?: string;
  totalSeasons?: number;
  firstSeasonAiredAt?: string;
  currentSeasonAiredAt?: string;
  watchStartedAt?: string;
  currentSeason?: number; // for "watching" / "dropped" status
  coverImageUrl?: string;
  status: DramaStatus;
  mediaTypes: DramaMediaType[];
  rating?: number; // 1-5
  tags: string[];
  genres: string[];
  memo?: string;
  tmdbId?: number;
  createdAt: string;
  updatedAt: string;
  sharedRatings?: SharedRating[];
}

export interface DramaCreateInput {
  title: string;
  seriesName?: string;
  totalSeasons?: number;
  firstSeasonAiredAt?: string;
  currentSeasonAiredAt?: string;
  watchStartedAt?: string;
  currentSeason?: number;
  coverImageUrl?: string;
  status: DramaStatus;
  mediaTypes: DramaMediaType[];
  genres?: string[];
  rating?: number;
  tags?: string[];
  memo?: string;
  tmdbId?: number;
}

export type DramaUpdateInput = Partial<DramaCreateInput>;
