package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

type BookFilterOptions struct {
	Genres     []string `json:"genres"`
	Tags       []string `json:"tags"`
	Publishers []string `json:"publishers"`
	Authors    []string `json:"authors"`
	MediaTypes []string `json:"mediaTypes"`
}

type MovieFilterOptions struct {
	Genres      []string `json:"genres"`
	Tags        []string `json:"tags"`
	Directors   []string `json:"directors"`
	Distributors []string `json:"distributors"`
	Studios     []string `json:"studios"`
}

type DramaFilterOptions struct {
	Genres    []string `json:"genres"`
	Tags      []string `json:"tags"`
	Directors []string `json:"directors"`
	Studios   []string `json:"studios"`
}

type AnimeFilterOptions struct {
	Genres    []string `json:"genres"`
	Tags      []string `json:"tags"`
	Directors []string `json:"directors"`
	Studios   []string `json:"studios"`
}

func distinctStrings(ctx context.Context, query string, args ...any) []string {
	result := []string{}
	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return result
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		rows.Scan(&s)
		result = append(result, s)
	}
	return result
}

func GetBookFilterOptions(ctx context.Context, userID string) *BookFilterOptions {
	return &BookFilterOptions{
		Genres: distinctStrings(ctx,
			`SELECT DISTINCT unnest(genres) AS g FROM books WHERE user_id=$1 AND array_length(genres,1)>0 ORDER BY g`, userID),
		Tags: distinctStrings(ctx,
			`SELECT DISTINCT t.name FROM tags t JOIN book_tags bt ON bt.tag_id=t.id JOIN books b ON b.id=bt.book_id WHERE b.user_id=$1 ORDER BY t.name`, userID),
		Publishers: distinctStrings(ctx,
			`SELECT DISTINCT publisher FROM books WHERE user_id=$1 AND publisher IS NOT NULL AND publisher!='' ORDER BY publisher`, userID),
		Authors: distinctStrings(ctx,
			`SELECT DISTINCT unnest(authors) AS a FROM books WHERE user_id=$1 AND array_length(authors,1)>0 ORDER BY a`, userID),
		MediaTypes: distinctStrings(ctx,
			`SELECT DISTINCT unnest(media_types) AS m FROM books WHERE user_id=$1 AND array_length(media_types,1)>0 ORDER BY m`, userID),
	}
}

func GetMovieFilterOptions(ctx context.Context, userID string) *MovieFilterOptions {
	return &MovieFilterOptions{
		Genres: distinctStrings(ctx,
			`SELECT DISTINCT unnest(genres) AS g FROM movies WHERE user_id=$1 AND array_length(genres,1)>0 ORDER BY g`, userID),
		Tags: distinctStrings(ctx,
			`SELECT DISTINCT t.name FROM tags t JOIN movie_tags mt ON mt.tag_id=t.id JOIN movies m ON m.id=mt.movie_id WHERE m.user_id=$1 ORDER BY t.name`, userID),
		Directors: distinctStrings(ctx,
			`SELECT DISTINCT unnest(directors) AS d FROM movies WHERE user_id=$1 AND array_length(directors,1)>0 ORDER BY d`, userID),
		Distributors: distinctStrings(ctx,
			`SELECT DISTINCT unnest(distributors) AS d FROM movies WHERE user_id=$1 AND array_length(distributors,1)>0 ORDER BY d`, userID),
		Studios: distinctStrings(ctx,
			`SELECT DISTINCT unnest(studios) AS s FROM movies WHERE user_id=$1 AND array_length(studios,1)>0 ORDER BY s`, userID),
	}
}

func GetDramaFilterOptions(ctx context.Context, userID string) *DramaFilterOptions {
	return &DramaFilterOptions{
		Genres: distinctStrings(ctx,
			`SELECT DISTINCT unnest(genres) AS g FROM dramas WHERE user_id=$1 AND array_length(genres,1)>0 ORDER BY g`, userID),
		Tags: distinctStrings(ctx,
			`SELECT DISTINCT t.name FROM tags t JOIN drama_tags dt ON dt.tag_id=t.id JOIN dramas d ON d.id=dt.drama_id WHERE d.user_id=$1 ORDER BY t.name`, userID),
		Directors: distinctStrings(ctx,
			`SELECT DISTINCT unnest(directors) AS d FROM dramas WHERE user_id=$1 AND array_length(directors,1)>0 ORDER BY d`, userID),
		Studios: distinctStrings(ctx,
			`SELECT DISTINCT unnest(studios) AS s FROM dramas WHERE user_id=$1 AND array_length(studios,1)>0 ORDER BY s`, userID),
	}
}

func GetAnimeFilterOptions(ctx context.Context, userID string) *AnimeFilterOptions {
	return &AnimeFilterOptions{
		Genres: distinctStrings(ctx,
			`SELECT DISTINCT unnest(genres) AS g FROM animes WHERE user_id=$1 AND array_length(genres,1)>0 ORDER BY g`, userID),
		Tags: distinctStrings(ctx,
			`SELECT DISTINCT t.name FROM tags t JOIN anime_tags at ON at.tag_id=t.id JOIN animes a ON a.id=at.anime_id WHERE a.user_id=$1 ORDER BY t.name`, userID),
		Directors: distinctStrings(ctx,
			`SELECT DISTINCT unnest(directors) AS d FROM animes WHERE user_id=$1 AND array_length(directors,1)>0 ORDER BY d`, userID),
		Studios: distinctStrings(ctx,
			`SELECT DISTINCT unnest(studios) AS s FROM animes WHERE user_id=$1 AND array_length(studios,1)>0 ORDER BY s`, userID),
	}
}
