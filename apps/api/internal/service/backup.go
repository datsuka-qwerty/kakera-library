package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/kakera-library/api/internal/db"
)

type BackupConfig struct {
	Enabled       bool `json:"enabled"`
	IntervalDays  int  `json:"intervalDays"`
	MaxBackups    int  `json:"maxBackups"`
}

func GetBackupConfig(ctx context.Context) (*BackupConfig, error) {
	var cfg BackupConfig
	err := db.Pool.QueryRow(ctx,
		`SELECT enabled, interval_days, max_backups FROM backup_config LIMIT 1`,
	).Scan(&cfg.Enabled, &cfg.IntervalDays, &cfg.MaxBackups)
	return &cfg, err
}

func UpdateBackupConfig(ctx context.Context, cfg BackupConfig) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE backup_config SET enabled=$1, interval_days=$2, max_backups=$3, updated_at=NOW()`,
		cfg.Enabled, cfg.IntervalDays, cfg.MaxBackups,
	)
	return err
}

func ListBackups() ([]string, error) {
	dir := os.Getenv("BACKUP_DIR")
	if dir == "" {
		dir = "/backups"
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql.gz") {
			files = append(files, e.Name())
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(files)))
	return files, nil
}

func RunBackup(ctx context.Context) (string, error) {
	dir := os.Getenv("BACKUP_DIR")
	if dir == "" {
		dir = "/backups"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("backup_%s.sql.gz", time.Now().UTC().Format("20060102_150405"))
	outPath := filepath.Join(dir, filename)

	dbURL := os.Getenv("DATABASE_URL")
	cmd := exec.CommandContext(ctx, "sh", "-c",
		fmt.Sprintf("pg_dump '%s' | gzip > '%s'", dbURL, outPath),
	)
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("pg_dump failed: %w", err)
	}

	// Prune old backups
	cfg, _ := GetBackupConfig(ctx)
	if cfg != nil && cfg.MaxBackups > 0 {
		pruneBackups(dir, cfg.MaxBackups)
	}

	return filename, nil
}

func RestoreBackup(ctx context.Context, filename string) error {
	dir := os.Getenv("BACKUP_DIR")
	if dir == "" {
		dir = "/backups"
	}
	path := filepath.Join(dir, filepath.Base(filename))
	dbURL := os.Getenv("DATABASE_URL")
	cmd := exec.CommandContext(ctx, "sh", "-c",
		fmt.Sprintf("gunzip -c '%s' | psql '%s'", path, dbURL),
	)
	return cmd.Run()
}

func pruneBackups(dir string, max int) {
	entries, _ := os.ReadDir(dir)
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql.gz") {
			files = append(files, e.Name())
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(files)))
	for i := max; i < len(files); i++ {
		os.Remove(filepath.Join(dir, files[i]))
	}
}

// --- Export / Import ---

type CategorySummary struct {
	Added   int `json:"added"`
	Updated int `json:"updated"`
	Skipped int `json:"skipped"`
}

type ImportResult struct {
	Books  CategorySummary `json:"books"`
	Movies CategorySummary `json:"movies"`
	Dramas CategorySummary `json:"dramas"`
}

type ExportData struct {
	ExportedAt string  `json:"exportedAt"`
	Books      []Book  `json:"books"`
	Movies     []Movie `json:"movies"`
	Dramas     []Drama `json:"dramas"`
}

func ExportUserData(ctx context.Context, userID string) (*ExportData, error) {
	books, err := ListBooks(ctx, userID, ListFilter{PerPage: 10000})
	if err != nil {
		return nil, err
	}
	movies, err := ListMovies(ctx, userID, ListFilter{PerPage: 10000})
	if err != nil {
		return nil, err
	}
	dramas, err := ListDramas(ctx, userID, ListFilter{PerPage: 10000})
	if err != nil {
		return nil, err
	}

	// Strip internal/sensitive fields so the export is portable and contains no other users' data.
	for i := range books.Data {
		books.Data[i].ID = ""
		books.Data[i].UserID = ""
		books.Data[i].CreatedAt = ""
		books.Data[i].UpdatedAt = ""
		books.Data[i].SharedRatings = nil
	}
	for i := range movies.Data {
		movies.Data[i].ID = ""
		movies.Data[i].UserID = ""
		movies.Data[i].CreatedAt = ""
		movies.Data[i].UpdatedAt = ""
		movies.Data[i].SharedRatings = nil
	}
	for i := range dramas.Data {
		dramas.Data[i].ID = ""
		dramas.Data[i].UserID = ""
		dramas.Data[i].CreatedAt = ""
		dramas.Data[i].UpdatedAt = ""
		dramas.Data[i].SharedRatings = nil
	}

	return &ExportData{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Books:      books.Data,
		Movies:     movies.Data,
		Dramas:     dramas.Data,
	}, nil
}

func toBookInput(b Book) BookInput {
	return BookInput{
		Title: b.Title, SeriesName: b.SeriesName, SeriesOrder: b.SeriesOrder,
		Authors: b.Authors, ISBN: b.ISBN, Publisher: b.Publisher,
		CoverImageURL: b.CoverImageURL, Status: b.Status, MediaTypes: b.MediaTypes,
		Genres: b.Genres, PurchasePlace: b.PurchasePlace, StartedAt: b.StartedAt, CompletedAt: b.CompletedAt,
		Rating: b.Rating, Tags: b.Tags, Memo: b.Memo, GoogleBooksID: b.GoogleBooksID,
	}
}

func toMovieInput(m Movie) MovieInput {
	return MovieInput{
		Title: m.Title, SeriesName: m.SeriesName, SeriesOrder: m.SeriesOrder,
		Directors: m.Directors, ReleasedAt: m.ReleasedAt, WatchedAt: m.WatchedAt,
		CoverImageURL: m.CoverImageURL, Status: m.Status, MediaTypes: m.MediaTypes,
		Genres: m.Genres, Rating: m.Rating, Tags: m.Tags, Memo: m.Memo, TmdbID: m.TmdbID,
	}
}

func toDramaInput(d Drama) DramaInput {
	return DramaInput{
		Title: d.Title, SeriesName: d.SeriesName, TotalSeasons: d.TotalSeasons,
		FirstSeasonAiredAt: d.FirstSeasonAiredAt, CurrentSeasonAiredAt: d.CurrentSeasonAiredAt,
		WatchStartedAt: d.WatchStartedAt, CurrentSeason: d.CurrentSeason,
		CoverImageURL: d.CoverImageURL, Status: d.Status, MediaTypes: d.MediaTypes,
		Genres: d.Genres, Rating: d.Rating, Tags: d.Tags, Memo: d.Memo, TmdbID: d.TmdbID,
	}
}

// Duplicate detection: prefer external IDs, fall back to title match.

func findDupBook(existing []Book, b Book) *Book {
	if b.GoogleBooksID != nil {
		for i := range existing {
			if existing[i].GoogleBooksID != nil && *existing[i].GoogleBooksID == *b.GoogleBooksID {
				return &existing[i]
			}
		}
	}
	if b.ISBN != nil {
		for i := range existing {
			if existing[i].ISBN != nil && *existing[i].ISBN == *b.ISBN {
				return &existing[i]
			}
		}
	}
	for i := range existing {
		if existing[i].Title == b.Title {
			return &existing[i]
		}
	}
	return nil
}

func findDupMovie(existing []Movie, m Movie) *Movie {
	if m.TmdbID != nil {
		for i := range existing {
			if existing[i].TmdbID != nil && *existing[i].TmdbID == *m.TmdbID {
				return &existing[i]
			}
		}
	}
	for i := range existing {
		if existing[i].Title == m.Title {
			return &existing[i]
		}
	}
	return nil
}

func findDupDrama(existing []Drama, d Drama) *Drama {
	if d.TmdbID != nil {
		for i := range existing {
			if existing[i].TmdbID != nil && *existing[i].TmdbID == *d.TmdbID {
				return &existing[i]
			}
		}
	}
	for i := range existing {
		if existing[i].Title == d.Title {
			return &existing[i]
		}
	}
	return nil
}

func ImportUserData(ctx context.Context, userID string, data json.RawMessage, mode string) (*ImportResult, error) {
	var export ExportData
	if err := json.Unmarshal(data, &export); err != nil {
		return nil, err
	}

	if mode == "replace" {
		for _, table := range []string{"books", "movies", "dramas"} {
			if _, err := db.Pool.Exec(ctx,
				fmt.Sprintf("DELETE FROM %s WHERE user_id = $1", table), userID,
			); err != nil {
				return nil, fmt.Errorf("failed to clear %s: %w", table, err)
			}
		}
	}

	// For duplicate-aware modes, fetch existing data once up front.
	var existingBooks []Book
	var existingMovies []Movie
	var existingDramas []Drama
	if mode == "merge-skip" || mode == "merge-overwrite" {
		if br, err := ListBooks(ctx, userID, ListFilter{PerPage: 10000}); err == nil {
			existingBooks = br.Data
		}
		if mr, err := ListMovies(ctx, userID, ListFilter{PerPage: 10000}); err == nil {
			existingMovies = mr.Data
		}
		if dr, err := ListDramas(ctx, userID, ListFilter{PerPage: 10000}); err == nil {
			existingDramas = dr.Data
		}
	}

	result := &ImportResult{}

	for _, b := range export.Books {
		if mode == "merge-skip" || mode == "merge-overwrite" {
			if dup := findDupBook(existingBooks, b); dup != nil {
				if mode == "merge-overwrite" {
					if _, err := UpdateBook(ctx, userID, dup.ID, toBookInput(b)); err == nil {
						result.Books.Updated++
					}
				} else {
					result.Books.Skipped++
				}
				continue
			}
		}
		if _, err := CreateBook(ctx, userID, toBookInput(b)); err == nil {
			result.Books.Added++
		}
	}
	for _, m := range export.Movies {
		if mode == "merge-skip" || mode == "merge-overwrite" {
			if dup := findDupMovie(existingMovies, m); dup != nil {
				if mode == "merge-overwrite" {
					if _, err := UpdateMovie(ctx, userID, dup.ID, toMovieInput(m)); err == nil {
						result.Movies.Updated++
					}
				} else {
					result.Movies.Skipped++
				}
				continue
			}
		}
		if _, err := CreateMovie(ctx, userID, toMovieInput(m)); err == nil {
			result.Movies.Added++
		}
	}
	for _, d := range export.Dramas {
		if mode == "merge-skip" || mode == "merge-overwrite" {
			if dup := findDupDrama(existingDramas, d); dup != nil {
				if mode == "merge-overwrite" {
					if _, err := UpdateDrama(ctx, userID, dup.ID, toDramaInput(d)); err == nil {
						result.Dramas.Updated++
					}
				} else {
					result.Dramas.Skipped++
				}
				continue
			}
		}
		if _, err := CreateDrama(ctx, userID, toDramaInput(d)); err == nil {
			result.Dramas.Added++
		}
	}
	return result, nil
}
