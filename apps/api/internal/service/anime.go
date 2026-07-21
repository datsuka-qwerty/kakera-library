package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/kakera-library/api/internal/db"
)

var ErrAnimeNotFound = errors.New("anime not found")

type Anime struct {
	ID                   string         `json:"id"`
	UserID               string         `json:"userId"`
	Title                string         `json:"title"`
	SeriesName           *string        `json:"seriesName"`
	TotalSeasons         *int           `json:"totalSeasons"`
	FirstSeasonAiredAt   *string        `json:"firstSeasonAiredAt"`
	CurrentSeasonAiredAt *string        `json:"currentSeasonAiredAt"`
	WatchStartedAt       *string        `json:"watchStartedAt"`
	CurrentSeason        *int           `json:"currentSeason"`
	CoverImageURL        *string        `json:"coverImageUrl"`
	Status               string         `json:"status"`
	MediaTypes           []string       `json:"mediaTypes"`
	Genres               []string       `json:"genres"`
	Directors            []string       `json:"directors"`
	Studios              []string       `json:"studios"`
	Rating               *int           `json:"rating"`
	Tags                 []string       `json:"tags"`
	Memo                 *string        `json:"memo"`
	TmdbID               *int           `json:"tmdbId"`
	CreatedAt            string         `json:"createdAt"`
	UpdatedAt            string         `json:"updatedAt"`
	SharedRatings        []SharedRating `json:"sharedRatings"`
}

type AnimeListResult struct {
	Data    []Anime `json:"data"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
	PerPage int     `json:"perPage"`
}

type AnimeInput struct {
	Title                string
	SeriesName           *string
	TotalSeasons         *int
	FirstSeasonAiredAt   *string
	CurrentSeasonAiredAt *string
	WatchStartedAt       *string
	CurrentSeason        *int
	CoverImageURL        *string
	Status               string
	MediaTypes           []string
	Genres               []string
	Directors            []string
	Studios              []string
	Rating               *int
	Tags                 []string
	Memo                 *string
	TmdbID               *int
}

func ListAnimes(ctx context.Context, userID string, f ListFilter) (*AnimeListResult, error) {
	f.defaults()
	where, args := buildWhere(userID, "animes", f)

	var total int
	db.Pool.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM animes WHERE %s`, where), args...).Scan(&total)

	args = append(args, f.PerPage, f.offset())
	rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT animes.id, animes.user_id, animes.title, animes.series_name, animes.total_seasons,
		       animes.first_season_aired_at::text, animes.current_season_aired_at::text,
		       animes.watch_started_at::text, animes.current_season, animes.cover_image_url,
		       animes.status, animes.media_types, animes.genres, animes.directors, animes.studios,
		       animes.rating, animes.memo, animes.tmdb_id,
		       animes.created_at::text, animes.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM animes
		LEFT JOIN anime_tags at ON at.anime_id = animes.id
		LEFT JOIN tags t ON t.id = at.tag_id
		WHERE %s
		GROUP BY animes.id
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, f.sortClause("animes"), len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	animes, err := scanAnimes(rows)
	if err != nil {
		return nil, err
	}
	return &AnimeListResult{Data: animes, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

func GetAnime(ctx context.Context, userID, id string) (*Anime, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT a.id, a.user_id, a.title, a.series_name, a.total_seasons,
		       a.first_season_aired_at::text, a.current_season_aired_at::text,
		       a.watch_started_at::text, a.current_season, a.cover_image_url,
		       a.status, a.media_types, a.genres, a.directors, a.studios,
		       a.rating, a.memo, a.tmdb_id,
		       a.created_at::text, a.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM animes a
		LEFT JOIN anime_tags at ON at.anime_id = a.id
		LEFT JOIN tags t ON t.id = at.tag_id
		WHERE a.id=$1 AND a.user_id=$2
		GROUP BY a.id
	`, id, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	animes, err := scanAnimes(rows)
	if err != nil || len(animes) == 0 {
		return nil, ErrAnimeNotFound
	}
	return &animes[0], nil
}

func CreateAnime(ctx context.Context, userID string, input AnimeInput) (*Anime, error) {
	if input.CoverImageURL != nil && *input.CoverImageURL != "" {
		stored := DownloadAndStoreImage(ctx, *input.CoverImageURL)
		input.CoverImageURL = &stored
	}
	if input.Directors == nil {
		input.Directors = []string{}
	}
	if input.Studios == nil {
		input.Studios = []string{}
	}
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO animes (id, user_id, title, series_name, total_seasons,
		  first_season_aired_at, current_season_aired_at, watch_started_at,
		  current_season, cover_image_url, status, media_types, genres, directors, studios, rating, memo, tmdb_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
	`, id, userID, input.Title, input.SeriesName, input.TotalSeasons,
		input.FirstSeasonAiredAt, input.CurrentSeasonAiredAt, input.WatchStartedAt,
		input.CurrentSeason, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Genres, input.Directors, input.Studios, input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncAnimeTags(ctx, userID, id, input.Tags)
	return GetAnime(ctx, userID, id)
}

func UpdateAnime(ctx context.Context, userID, id string, input AnimeInput) (*Anime, error) {
	var oldURL string
	db.Pool.QueryRow(ctx, `SELECT COALESCE(cover_image_url,'') FROM animes WHERE id=$1 AND user_id=$2`, id, userID).Scan(&oldURL)

	if input.CoverImageURL != nil && *input.CoverImageURL != "" {
		stored := DownloadAndStoreImage(ctx, *input.CoverImageURL)
		input.CoverImageURL = &stored
	}
	if input.Directors == nil {
		input.Directors = []string{}
	}
	if input.Studios == nil {
		input.Studios = []string{}
	}

	_, err := db.Pool.Exec(ctx, `
		UPDATE animes SET
		  title=$3, series_name=$4, total_seasons=$5,
		  first_season_aired_at=$6, current_season_aired_at=$7, watch_started_at=$8,
		  current_season=$9, cover_image_url=$10, status=$11, media_types=$12,
		  genres=$13, directors=$14, studios=$15, rating=$16, memo=$17, tmdb_id=$18, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
	`, id, userID, input.Title, input.SeriesName, input.TotalSeasons,
		input.FirstSeasonAiredAt, input.CurrentSeasonAiredAt, input.WatchStartedAt,
		input.CurrentSeason, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Genres, input.Directors, input.Studios, input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncAnimeTags(ctx, userID, id, input.Tags)

	newURL := ""
	if input.CoverImageURL != nil {
		newURL = *input.CoverImageURL
	}
	if oldURL != newURL {
		DeleteImageIfOrphaned(ctx, oldURL)
	}

	return GetAnime(ctx, userID, id)
}

func DeleteAnime(ctx context.Context, userID, id string) error {
	var oldURL string
	db.Pool.QueryRow(ctx, `SELECT COALESCE(cover_image_url,'') FROM animes WHERE id=$1 AND user_id=$2`, id, userID).Scan(&oldURL)

	_, err := db.Pool.Exec(ctx, `DELETE FROM animes WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	DeleteImageIfOrphaned(ctx, oldURL)
	return nil
}

func syncAnimeTags(ctx context.Context, userID, animeID string, tagNames []string) {
	db.Pool.Exec(ctx, `DELETE FROM anime_tags WHERE anime_id=$1`, animeID)
	for _, name := range tagNames {
		var tagID string
		err := db.Pool.QueryRow(ctx, `SELECT id FROM tags WHERE user_id=$1 AND name=$2`, userID, name).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			db.Pool.Exec(ctx, `INSERT INTO tags (id, user_id, name) VALUES ($1,$2,$3)`, tagID, userID, name)
		}
		db.Pool.Exec(ctx, `INSERT INTO anime_tags (anime_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, animeID, tagID)
	}
}

func scanAnimes(rows pgx.Rows) ([]Anime, error) {
	animes := make([]Anime, 0)
	for rows.Next() {
		var a Anime
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Title, &a.SeriesName, &a.TotalSeasons,
			&a.FirstSeasonAiredAt, &a.CurrentSeasonAiredAt,
			&a.WatchStartedAt, &a.CurrentSeason, &a.CoverImageURL,
			&a.Status, &a.MediaTypes, &a.Genres, &a.Directors, &a.Studios,
			&a.Rating, &a.Memo, &a.TmdbID,
			&a.CreatedAt, &a.UpdatedAt, &a.Tags,
		); err != nil {
			return nil, err
		}
		animes = append(animes, a)
	}
	return animes, nil
}
