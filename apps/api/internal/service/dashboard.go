package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

type CategoryStats struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"byStatus"`
	ByMonth  map[string]int `json:"byMonth"`
}

type DashboardStats struct {
	Books  CategoryStats `json:"books"`
	Movies CategoryStats `json:"movies"`
	Dramas CategoryStats `json:"dramas"`
}

func GetDashboardStats(ctx context.Context, userID string) (*DashboardStats, error) {
	stats := &DashboardStats{
		Books:  CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}},
		Movies: CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}},
		Dramas: CategoryStats{ByStatus: map[string]int{}, ByMonth: map[string]int{}},
	}

	// Books
	rows, err := db.Pool.Query(ctx,
		`SELECT status, COUNT(*) FROM books WHERE user_id=$1 GROUP BY status`, userID)
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

	rows, err = db.Pool.Query(ctx,
		`SELECT TO_CHAR(completed_at, 'YYYY-MM'), COUNT(*) FROM books
		 WHERE user_id=$1 AND completed_at IS NOT NULL
		 GROUP BY 1 ORDER BY 1`, userID)
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

	// Movies
	rows, err = db.Pool.Query(ctx,
		`SELECT status, COUNT(*) FROM movies WHERE user_id=$1 GROUP BY status`, userID)
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

	rows, err = db.Pool.Query(ctx,
		`SELECT TO_CHAR(watched_at, 'YYYY-MM'), COUNT(*) FROM movies
		 WHERE user_id=$1 AND watched_at IS NOT NULL
		 GROUP BY 1 ORDER BY 1`, userID)
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

	// Dramas
	rows, err = db.Pool.Query(ctx,
		`SELECT status, COUNT(*) FROM dramas WHERE user_id=$1 GROUP BY status`, userID)
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

	rows, err = db.Pool.Query(ctx,
		`SELECT TO_CHAR(watch_started_at, 'YYYY-MM'), COUNT(*) FROM dramas
		 WHERE user_id=$1 AND status='completed' AND watch_started_at IS NOT NULL
		 GROUP BY 1 ORDER BY 1`, userID)
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

	return stats, nil
}
