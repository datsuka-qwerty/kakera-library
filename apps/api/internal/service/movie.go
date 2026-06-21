package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/kakera-library/api/internal/db"
)

var ErrMovieNotFound = errors.New("movie not found")

type Movie struct {
	ID            string   `json:"id"`
	UserID        string   `json:"userId"`
	Title         string   `json:"title"`
	SeriesName    *string  `json:"seriesName"`
	SeriesOrder   *int     `json:"seriesOrder"`
	Directors     []string `json:"directors"`
	ReleasedAt    *string  `json:"releasedAt"`
	WatchedAt     *string  `json:"watchedAt"`
	CoverImageURL *string  `json:"coverImageUrl"`
	Status        string   `json:"status"`
	MediaTypes    []string `json:"mediaTypes"`
	Genres        []string `json:"genres"`
	Rating        *int     `json:"rating"`
	Tags          []string `json:"tags"`
	Memo          *string  `json:"memo"`
	TmdbID        *int           `json:"tmdbId"`
	CreatedAt     string         `json:"createdAt"`
	UpdatedAt     string         `json:"updatedAt"`
	SharedRatings []SharedRating `json:"sharedRatings"`
}

type MovieListResult struct {
	Data    []Movie `json:"data"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
	PerPage int     `json:"perPage"`
}

type MovieInput struct {
	Title         string
	SeriesName    *string
	SeriesOrder   *int
	Directors     []string
	ReleasedAt    *string
	WatchedAt     *string
	CoverImageURL *string
	Status        string
	MediaTypes    []string
	Genres        []string
	Rating        *int
	Tags          []string
	Memo          *string
	TmdbID        *int
}

func ListMovies(ctx context.Context, userID string, f ListFilter) (*MovieListResult, error) {
	f.defaults()
	where, args := buildWhere(userID, "movies", f)

	var total int
	db.Pool.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM movies WHERE %s`, where), args...).Scan(&total)

	args = append(args, f.PerPage, f.offset())
	rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT movies.id, movies.user_id, movies.title, movies.series_name, movies.series_order, movies.directors,
		       movies.released_at::text, movies.watched_at::text, movies.cover_image_url, movies.status,
		       movies.media_types, movies.genres, movies.rating, movies.memo, movies.tmdb_id, movies.created_at::text, movies.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM movies
		LEFT JOIN movie_tags mt ON mt.movie_id = movies.id
		LEFT JOIN tags t ON t.id = mt.tag_id
		WHERE %s
		GROUP BY movies.id
		ORDER BY movies.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	movies, err := scanMovies(rows)
	if err != nil {
		return nil, err
	}
	EnrichMoviesWithSharedRatings(ctx, userID, movies)
	return &MovieListResult{Data: movies, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

func GetMovie(ctx context.Context, userID, id string) (*Movie, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT m.id, m.user_id, m.title, m.series_name, m.series_order, m.directors,
		       m.released_at::text, m.watched_at::text, m.cover_image_url, m.status,
		       m.media_types, m.genres, m.rating, m.memo, m.tmdb_id, m.created_at::text, m.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM movies m
		LEFT JOIN movie_tags mt ON mt.movie_id = m.id
		LEFT JOIN tags t ON t.id = mt.tag_id
		WHERE m.id=$1 AND m.user_id=$2
		GROUP BY m.id
	`, id, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	movies, err := scanMovies(rows)
	if err != nil || len(movies) == 0 {
		return nil, ErrMovieNotFound
	}
	EnrichMoviesWithSharedRatings(ctx, userID, movies)
	return &movies[0], nil
}

func CreateMovie(ctx context.Context, userID string, input MovieInput) (*Movie, error) {
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO movies (id, user_id, title, series_name, series_order, directors,
		  released_at, watched_at, cover_image_url, status, media_types, genres, rating, memo, tmdb_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
	`, id, userID, input.Title, input.SeriesName, input.SeriesOrder, input.Directors,
		input.ReleasedAt, input.WatchedAt, input.CoverImageURL, input.Status,
		input.MediaTypes, input.Genres, input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncMovieTags(ctx, userID, id, input.Tags)
	return GetMovie(ctx, userID, id)
}

func UpdateMovie(ctx context.Context, userID, id string, input MovieInput) (*Movie, error) {
	_, err := db.Pool.Exec(ctx, `
		UPDATE movies SET
		  title=$3, series_name=$4, series_order=$5, directors=$6,
		  released_at=$7, watched_at=$8, cover_image_url=$9, status=$10,
		  media_types=$11, genres=$12, rating=$13, memo=$14, tmdb_id=$15, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
	`, id, userID, input.Title, input.SeriesName, input.SeriesOrder, input.Directors,
		input.ReleasedAt, input.WatchedAt, input.CoverImageURL, input.Status,
		input.MediaTypes, input.Genres, input.Rating, input.Memo, input.TmdbID,
	)
	if err != nil {
		return nil, err
	}
	syncMovieTags(ctx, userID, id, input.Tags)
	return GetMovie(ctx, userID, id)
}

func DeleteMovie(ctx context.Context, userID, id string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM movies WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

func syncMovieTags(ctx context.Context, userID, movieID string, tagNames []string) {
	db.Pool.Exec(ctx, `DELETE FROM movie_tags WHERE movie_id=$1`, movieID)
	for _, name := range tagNames {
		var tagID string
		err := db.Pool.QueryRow(ctx, `SELECT id FROM tags WHERE user_id=$1 AND name=$2`, userID, name).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			db.Pool.Exec(ctx, `INSERT INTO tags (id, user_id, name) VALUES ($1,$2,$3)`, tagID, userID, name)
		}
		db.Pool.Exec(ctx, `INSERT INTO movie_tags (movie_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, movieID, tagID)
	}
}

func scanMovies(rows pgx.Rows) ([]Movie, error) {
	movies := make([]Movie, 0)
	for rows.Next() {
		var m Movie
		if err := rows.Scan(
			&m.ID, &m.UserID, &m.Title, &m.SeriesName, &m.SeriesOrder, &m.Directors,
			&m.ReleasedAt, &m.WatchedAt, &m.CoverImageURL, &m.Status,
			&m.MediaTypes, &m.Genres, &m.Rating, &m.Memo, &m.TmdbID, &m.CreatedAt, &m.UpdatedAt, &m.Tags,
		); err != nil {
			return nil, err
		}
		movies = append(movies, m)
	}
	return movies, nil
}
