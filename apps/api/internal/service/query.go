package service

import (
	"fmt"
	"strings"
)

type ListFilter struct {
	Search  string
	Status  string
	Tags    []string
	Rating  *int
	Page    int
	PerPage int
}

func (f *ListFilter) defaults() {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 || f.PerPage > 100 {
		f.PerPage = 20
	}
}

func (f *ListFilter) offset() int {
	return (f.Page - 1) * f.PerPage
}

// buildWhere builds WHERE clauses and args for book/movie/drama list queries.
// table must be "books", "movies", or "dramas".
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
		conds = append(conds, fmt.Sprintf("%s.rating = $%d", table, len(args)))
	}

	return strings.Join(conds, " AND "), args
}
