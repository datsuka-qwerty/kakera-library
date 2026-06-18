package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/kakera-library/api/internal/db"
)

var ErrDramaNotFound = errors.New("drama not found")

type Drama struct {
	ID                   string   `json:"id"`
	UserID               string   `json:"userId"`
	Title                string   `json:"title"`
	SeriesName           *string  `json:"seriesName"`
	TotalSeasons         *int     `json:"totalSeasons"`
	FirstSeasonAiredAt   *string  `json:"firstSeasonAiredAt"`
	CurrentSeasonAiredAt *string  `json:"currentSeasonAiredAt"`
	WatchStartedAt       *string  `json:"watchStartedAt"`
	CurrentSeason        *int     `json:"currentSeason"`
	CoverImageURL        *string  `json:"coverImageUrl"`
	Status               string   `json:"status"`
	MediaTypes           []string `json:"mediaTypes"`
	Rating               *int     `json:"rating"`
	Tags                 []string `json:"tags"`
	Memo                 *string  `json:"memo"`
	TmdbID               *int     `json:"tmdbId"`
	CreatedAt            string   `json:"createdAt"`
	UpdatedAt            string   `json:"updatedAt"`
}

type DramaListResult struct {
	Data    []Drama `json:"data"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
	PerPage int     `json:"perPage"`
}

type DramaInput struct {
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
	Rating               *int
	Tags                 []string
	Memo                 *string
	TmdbID               *int
}

func ListDramas(ctx context.Context, userID string, f ListFilter) (*DramaListResult, error) {
	f.defaults()
	where, args := buildWhere(userID, "dramas", f)

	var total int
	db.Pool.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM dramas WHERE %s`, where), args...).Scan(&total)

	args = append(args, f.PerPage, f.offset())
	rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT d.id, d.user_id, d.title, d.series_name, d.total_seasons,
		       d.first_season_aired_at::text, d.current_season_aired_at::text,
		       d.watch_started_at::text, d.current_season, d.cover_image_url,
		       d.status, d.media_types, d.rating, d.memo, d.tmdb_id,
		       d.created_at::text, d.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM dramas d
		LEFT JOIN drama_tags dt ON dt.drama_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE %s
		GROUP BY d.id
		ORDER BY d.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dramas, err := scanDramas(rows)
	if err != nil {
		return nil, err
	}
	return &DramaListResult{Data: dramas, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

func GetDrama(ctx context.Context, userID, id string) (*Drama, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT d.id, d.user_id, d.title, d.series_name, d.total_seasons,
		       d.first_season_aired_at::text, d.current_season_aired_at::text,
		       d.watch_started_at::text, d.current_season, d.cover_image_url,
		       d.status, d.media_types, d.rating, d.memo, d.tmdb_id,
		       d.created_at::text, d.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM dramas d
		LEFT JOIN drama_tags dt ON dt.drama_id = d.id
		LEFT JOIN tags t ON t.id = dt.tag_id
		WHERE d.id=$1 AND d.user_id=$2
		GROUP BY d.id
	`, id, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dramas, err := scanDramas(rows)
	if err != nil || len(dramas) == 0 {
		return nil, ErrDramaNotFound
	}
	return &dramas[0], nil
}

func CreateDrama(ctx context.Context, userID string, input DramaInput) (*Drama, error) {
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO dramas (id, user_id, title, series_name, total_seasons,
		  first_season_aired_at, current_season_aired_at, watch_started_at,
		  current_season, cover_image_url, status, media_types, rating, memo, tmdb_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
	`, id, userID, input.Title, input.SeriesName, input.TotalSeasons,
		input.FirstSeasonAiredAt, input.CurrentSeasonAiredAt, input.WatchStartedAt,
		input.CurrentSeason, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncDramaTags(ctx, userID, id, input.Tags)
	return GetDrama(ctx, userID, id)
}

func UpdateDrama(ctx context.Context, userID, id string, input DramaInput) (*Drama, error) {
	_, err := db.Pool.Exec(ctx, `
		UPDATE dramas SET
		  title=$3, series_name=$4, total_seasons=$5,
		  first_season_aired_at=$6, current_season_aired_at=$7, watch_started_at=$8,
		  current_season=$9, cover_image_url=$10, status=$11, media_types=$12,
		  rating=$13, memo=$14, tmdb_id=$15, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
	`, id, userID, input.Title, input.SeriesName, input.TotalSeasons,
		input.FirstSeasonAiredAt, input.CurrentSeasonAiredAt, input.WatchStartedAt,
		input.CurrentSeason, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncDramaTags(ctx, userID, id, input.Tags)
	return GetDrama(ctx, userID, id)
}

func DeleteDrama(ctx context.Context, userID, id string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM dramas WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func syncDramaTags(ctx context.Context, userID, dramaID string, tagNames []string) {
	db.Pool.Exec(ctx, `DELETE FROM drama_tags WHERE drama_id=$1`, dramaID)
	for _, name := range tagNames {
		var tagID string
		err := db.Pool.QueryRow(ctx, `SELECT id FROM tags WHERE user_id=$1 AND name=$2`, userID, name).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			db.Pool.Exec(ctx, `INSERT INTO tags (id, user_id, name) VALUES ($1,$2,$3)`, tagID, userID, name)
		}
		db.Pool.Exec(ctx, `INSERT INTO drama_tags (drama_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, dramaID, tagID)
	}
}

func scanDramas(rows pgx.Rows) ([]Drama, error) {
	var dramas []Drama
	for rows.Next() {
		var d Drama
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.Title, &d.SeriesName, &d.TotalSeasons,
			&d.FirstSeasonAiredAt, &d.CurrentSeasonAiredAt,
			&d.WatchStartedAt, &d.CurrentSeason, &d.CoverImageURL,
			&d.Status, &d.MediaTypes, &d.Rating, &d.Memo, &d.TmdbID,
			&d.CreatedAt, &d.UpdatedAt, &d.Tags,
		); err != nil {
			return nil, err
		}
		dramas = append(dramas, d)
	}
	return dramas, nil
}
