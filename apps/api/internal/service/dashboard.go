package service

import (
	"context"
	"fmt"

	"github.com/kakera-library/api/internal/db"
)

type CategoryStats struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"byStatus"`
	ByMonth  map[string]int `json:"byMonth"`
	ByGenre  map[string]int `json:"byGenre"`
}

type DashboardStats struct {
	Books  CategoryStats `json:"books"`
	Movies CategoryStats `json:"movies"`
	Dramas CategoryStats `json:"dramas"`
	Animes CategoryStats `json:"animes"`
}

// DashboardFilter controls which time range to aggregate over.
// Period: "all" | "yearly" | "monthly"
type DashboardFilter struct {
	Period string
	Year   int
	Month  int // 1-12, used only when Period="monthly"
}

// registeredWhere returns a SQL fragment (and args slice) that filters rows
// by created_at according to the period. argOffset is the index of the next
// placeholder already used (e.g. 1 for userID already being $1).
func registeredWhere(alias string, f DashboardFilter, argOffset int) (string, []interface{}) {
	col := alias + ".created_at"
	switch f.Period {
	case "yearly":
		return fmt.Sprintf(" AND EXTRACT(year FROM %s) = $%d", col, argOffset+1),
			[]interface{}{f.Year}
	case "monthly":
		return fmt.Sprintf(" AND EXTRACT(year FROM %s) = $%d AND EXTRACT(month FROM %s) = $%d",
			col, argOffset+1, col, argOffset+2),
			[]interface{}{f.Year, f.Month}
	default:
		return "", nil
	}
}

// completedWhere returns a SQL fragment that filters completion date columns.
func completedWhere(dateCol string, f DashboardFilter, argOffset int) (string, []interface{}) {
	switch f.Period {
	case "yearly":
		return fmt.Sprintf(" AND EXTRACT(year FROM %s) = $%d", dateCol, argOffset+1),
			[]interface{}{f.Year}
	case "monthly":
		return fmt.Sprintf(" AND EXTRACT(year FROM %s) = $%d AND EXTRACT(month FROM %s) = $%d",
			dateCol, argOffset+1, dateCol, argOffset+2),
			[]interface{}{f.Year, f.Month}
	default:
		return "", nil
	}
}

func GetDashboardStats(ctx context.Context, userID string, f DashboardFilter) (*DashboardStats, error) {
	stats := &DashboardStats{
		Books:  CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}, ByGenre: map[string]int{}},
		Movies: CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}, ByGenre: map[string]int{}},
		Dramas: CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}, ByGenre: map[string]int{}},
		Animes: CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}, ByGenre: map[string]int{}},
	}

	// ── Books ──────────────────────────────────────────────────────────────
	regW, regA := registeredWhere("books", f, 1)
	args := append([]interface{}{userID}, regA...)
	rows, err := db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT status, COUNT(*) FROM books WHERE user_id=$1%s GROUP BY status`, regW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		stats.Books.ByStatus[status] = count
		stats.Books.Total += count
	}
	rows.Close()

	cmpW, cmpA := completedWhere("completed_at", f, 1)
	args = append([]interface{}{userID}, cmpA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT TO_CHAR(completed_at, 'YYYY-MM'), COUNT(*) FROM books
		 WHERE user_id=$1 AND completed_at IS NOT NULL%s
		 GROUP BY 1 ORDER BY 1`, cmpW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var month string
		var count int
		rows.Scan(&month, &count)
		stats.Books.ByMonth[month] = count
	}
	rows.Close()

	// ── Books by genre ─────────────────────────────────────────────────────
	regW, regA = registeredWhere("books", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT g, COUNT(*) FROM books, unnest(genres) AS g
		 WHERE user_id=$1%s GROUP BY g ORDER BY 2 DESC LIMIT 20`, regW),
		args...)
	if err == nil {
		for rows.Next() {
			var genre string
			var count int
			rows.Scan(&genre, &count)
			stats.Books.ByGenre[genre] = count
		}
		rows.Close()
	}

	// ── Movies ─────────────────────────────────────────────────────────────
	regW, regA = registeredWhere("movies", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT status, COUNT(*) FROM movies WHERE user_id=$1%s GROUP BY status`, regW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		stats.Movies.ByStatus[status] = count
		stats.Movies.Total += count
	}
	rows.Close()

	cmpW, cmpA = completedWhere("watched_at", f, 1)
	args = append([]interface{}{userID}, cmpA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT TO_CHAR(watched_at, 'YYYY-MM'), COUNT(*) FROM movies
		 WHERE user_id=$1 AND watched_at IS NOT NULL%s
		 GROUP BY 1 ORDER BY 1`, cmpW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var month string
		var count int
		rows.Scan(&month, &count)
		stats.Movies.ByMonth[month] = count
	}
	rows.Close()

	// ── Movies by genre ────────────────────────────────────────────────────
	regW, regA = registeredWhere("movies", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT g, COUNT(*) FROM movies, unnest(genres) AS g
		 WHERE user_id=$1%s GROUP BY g ORDER BY 2 DESC LIMIT 20`, regW),
		args...)
	if err == nil {
		for rows.Next() {
			var genre string
			var count int
			rows.Scan(&genre, &count)
			stats.Movies.ByGenre[genre] = count
		}
		rows.Close()
	}

	// ── Dramas ─────────────────────────────────────────────────────────────
	regW, regA = registeredWhere("dramas", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT status, COUNT(*) FROM dramas WHERE user_id=$1%s GROUP BY status`, regW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		stats.Dramas.ByStatus[status] = count
		stats.Dramas.Total += count
	}
	rows.Close()

	cmpW, cmpA = completedWhere("watch_started_at", f, 1)
	args = append([]interface{}{userID}, cmpA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT TO_CHAR(watch_started_at, 'YYYY-MM'), COUNT(*) FROM dramas
		 WHERE user_id=$1 AND status='completed' AND watch_started_at IS NOT NULL%s
		 GROUP BY 1 ORDER BY 1`, cmpW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var month string
		var count int
		rows.Scan(&month, &count)
		stats.Dramas.ByMonth[month] = count
	}
	rows.Close()

	// ── Dramas by genre ────────────────────────────────────────────────────
	regW, regA = registeredWhere("dramas", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT g, COUNT(*) FROM dramas, unnest(genres) AS g
		 WHERE user_id=$1%s GROUP BY g ORDER BY 2 DESC LIMIT 20`, regW),
		args...)
	if err == nil {
		for rows.Next() {
			var genre string
			var count int
			rows.Scan(&genre, &count)
			stats.Dramas.ByGenre[genre] = count
		}
		rows.Close()
	}

	// ── Animes ─────────────────────────────────────────────────────────────
	regW, regA = registeredWhere("animes", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT status, COUNT(*) FROM animes WHERE user_id=$1%s GROUP BY status`, regW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		stats.Animes.ByStatus[status] = count
		stats.Animes.Total += count
	}
	rows.Close()

	cmpW, cmpA = completedWhere("watch_started_at", f, 1)
	args = append([]interface{}{userID}, cmpA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT TO_CHAR(watch_started_at, 'YYYY-MM'), COUNT(*) FROM animes
		 WHERE user_id=$1 AND status='completed' AND watch_started_at IS NOT NULL%s
		 GROUP BY 1 ORDER BY 1`, cmpW),
		args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var month string
		var count int
		rows.Scan(&month, &count)
		stats.Animes.ByMonth[month] = count
	}
	rows.Close()

	// ── Animes by genre ────────────────────────────────────────────────────
	regW, regA = registeredWhere("animes", f, 1)
	args = append([]interface{}{userID}, regA...)
	rows, err = db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT g, COUNT(*) FROM animes, unnest(genres) AS g
		 WHERE user_id=$1%s GROUP BY g ORDER BY 2 DESC LIMIT 20`, regW),
		args...)
	if err == nil {
		for rows.Next() {
			var genre string
			var count int
			rows.Scan(&genre, &count)
			stats.Animes.ByGenre[genre] = count
		}
		rows.Close()
	}

	return stats, nil
}
