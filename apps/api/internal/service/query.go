package service

import (
	"fmt"
	"strings"
)

type ListFilter struct {
	Search          string
	Status          string
	Tags            []string
	Rating          *int
	Genre           string
	Tag             string
	// content-type-specific filters
	Author          string // books
	Publisher       string // books
	MediaTypeFilter string // all (media_types column)
	Director        string // movies, dramas, animes
	Studio          string // movies, dramas, animes
	Distributor     string // movies
	Page            int
	PerPage         int
	Sort            string
	Order           string
}

var allowedSortCols = map[string]map[string]string{
	"books": {
		"created_at":   "books.created_at",
		"published_at": "books.published_at",
		"completed_at": "books.completed_at",
		"started_at":   "books.started_at",
		"title":        "books.title",
		"rating":       "books.rating",
	},
	"movies": {
		"created_at":  "movies.created_at",
		"released_at": "movies.released_at",
		"watched_at":  "movies.watched_at",
		"title":       "movies.title",
		"rating":      "movies.rating",
	},
	"dramas": {
		"created_at":              "dramas.created_at",
		"first_season_aired_at":   "dramas.first_season_aired_at",
		"current_season_aired_at": "dramas.current_season_aired_at",
		"title":                   "dramas.title",
		"rating":                  "dramas.rating",
	},
	"animes": {
		"created_at":              "animes.created_at",
		"first_season_aired_at":   "animes.first_season_aired_at",
		"current_season_aired_at": "animes.current_season_aired_at",
		"title":                   "animes.title",
		"rating":                  "animes.rating",
	},
}

// tagJoin maps table name → (join table, FK column name)
var tagJoin = map[string][2]string{
	"books":  {"book_tags", "book_id"},
	"movies": {"movie_tags", "movie_id"},
	"dramas": {"drama_tags", "drama_id"},
	"animes": {"anime_tags", "anime_id"},
}

func (f *ListFilter) defaults() {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 || f.PerPage > 500 {
		f.PerPage = 20
	}
}

func (f *ListFilter) offset() int {
	return (f.Page - 1) * f.PerPage
}

func (f *ListFilter) sortClause(table string) string {
	col, ok := allowedSortCols[table][f.Sort]
	if !ok {
		col = fmt.Sprintf("%s.created_at", table)
	}
	dir := "DESC"
	if strings.ToLower(f.Order) == "asc" {
		dir = "ASC"
	}
	return fmt.Sprintf("%s %s NULLS LAST", col, dir)
}

func buildWhere(userID, table string, f ListFilter) (string, []any) {
	args := []any{userID}
	conds := []string{fmt.Sprintf("%s.user_id = $%d", table, len(args))}

	if f.Status != "" {
		args = append(args, f.Status)
		conds = append(conds, fmt.Sprintf("%s.status = $%d", table, len(args)))
	}

	if f.Search != "" {
		args = append(args, "%"+strings.ToLower(f.Search)+"%")
		conds = append(conds, fmt.Sprintf("LOWER(%s.title) LIKE $%d", table, len(args)))
	}

	if f.Rating != nil {
		args = append(args, *f.Rating)
		conds = append(conds, fmt.Sprintf("%s.rating >= $%d", table, len(args)))
	}

	if f.Genre != "" {
		args = append(args, f.Genre)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.genres)", len(args), table))
	}

	if f.Tag != "" {
		if tj, ok := tagJoin[table]; ok {
			args = append(args, strings.ToLower(f.Tag))
			conds = append(conds, fmt.Sprintf(
				`EXISTS (SELECT 1 FROM %s _tj JOIN tags _t ON _t.id = _tj.tag_id WHERE _tj.%s = %s.id AND LOWER(_t.name) = $%d)`,
				tj[0], tj[1], table, len(args),
			))
		}
	}

	if f.Author != "" && table == "books" {
		args = append(args, f.Author)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.authors)", len(args), table))
	}
	if f.Publisher != "" && table == "books" {
		args = append(args, f.Publisher)
		conds = append(conds, fmt.Sprintf("%s.publisher = $%d", table, len(args)))
	}
	if f.MediaTypeFilter != "" {
		args = append(args, f.MediaTypeFilter)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.media_types)", len(args), table))
	}
	if f.Director != "" && (table == "movies" || table == "dramas" || table == "animes") {
		args = append(args, f.Director)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.directors)", len(args), table))
	}
	if f.Studio != "" && (table == "movies" || table == "dramas" || table == "animes") {
		args = append(args, f.Studio)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.studios)", len(args), table))
	}
	if f.Distributor != "" && table == "movies" {
		args = append(args, f.Distributor)
		conds = append(conds, fmt.Sprintf("$%d = ANY(%s.distributors)", len(args), table))
	}

	return strings.Join(conds, " AND "), args
}
