import type { SharedRating } from "./common";

export type AnimeStatus = "interested" | "watching" | "completed" | "dropped";

export type AnimeMediaType = string;

export interface Anime {
  id: string;
  userId: string;
  title: string;
  seriesName?: string;
  totalSeasons?: number;
  firstSeasonAiredAt?: string;
  currentSeasonAiredAt?: string;
  watchStartedAt?: string;
  currentSeason?: number;
  coverImageUrl?: string;
  status: AnimeStatus;
  mediaTypes: AnimeMediaType[];
  genres: string[];
  directors: string[];
  studios: string[];
  rating?: number;
  tags: string[];
  memo?: string;
  tmdbId?: number;
  createdAt: string;
  updatedAt: string;
  sharedRatings?: SharedRating[];
}

export interface AnimeCreateInput {
  title: string;
  seriesName?: string;
  totalSeasons?: number;
  firstSeasonAiredAt?: string;
  currentSeasonAiredAt?: string;
  watchStartedAt?: string;
  currentSeason?: number;
  coverImageUrl?: string;
  status: AnimeStatus;
  mediaTypes: AnimeMediaType[];
  genres?: string[];
  directors?: string[];
  studios?: string[];
  rating?: number;
  tags?: string[];
  memo?: string;
  tmdbId?: number;
}

export type AnimeUpdateInput = Partial<AnimeCreateInput>;
