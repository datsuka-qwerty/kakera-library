package service

import (
	"fmt"
	"strings"
)

type ListFilter struct {
	Search    string
	Status    string
	Tags      []string
	Rating    *int
	Genre     string
	Tag       string
	Page      int
	PerPage   int
	Sort      string
	Order     string
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

	return strings.Join(conds, " AND "), args
}
