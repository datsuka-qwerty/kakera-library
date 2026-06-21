import type { SharedRating } from "./common";

export type MovieStatus = "unwatched" | "watched";

export type MovieMediaType = string; // user-extensible: "netflix" | "amazon_prime" | "fod" | "u_next" | "theater" | ...

export interface Movie {
  id: string;
  userId: string;
  title: string;
  seriesName?: string;
  seriesOrder?: number;
  directors: string[];
  releasedAt?: string;
  watchedAt?: string;
  coverImageUrl?: string;
  status: MovieStatus;
  mediaTypes: MovieMediaType[];
  rating?: number; // 1-5
  tags: string[];
  genres: string[];
  memo?: string;
  tmdbId?: number;
  createdAt: string;
  updatedAt: string;
  sharedRatings?: SharedRating[];
}

export interface MovieCreateInput {
  title: string;
  seriesName?: string;
  seriesOrder?: number;
  directors?: string[];
  releasedAt?: string;
  watchedAt?: string;
  coverImageUrl?: string;
  status: MovieStatus;
  mediaTypes: MovieMediaType[];
  genres?: string[];
  rating?: number;
  tags?: string[];
  memo?: string;
  tmdbId?: number;
}

export type MovieUpdateInput = Partial<MovieCreateInput>;
