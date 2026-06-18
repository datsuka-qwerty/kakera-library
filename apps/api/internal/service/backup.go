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
	return &ExportData{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Books:      books.Data,
		Movies:     movies.Data,
		Dramas:     dramas.Data,
	}, nil
}

func ImportUserData(ctx context.Context, userID string, data json.RawMessage) error {
	var export ExportData
	if err := json.Unmarshal(data, &export); err != nil {
		return err
	}
	for _, b := range export.Books {
		CreateBook(ctx, userID, BookInput{
			Title: b.Title, SeriesName: b.SeriesName, SeriesOrder: b.SeriesOrder,
			Authors: b.Authors, ISBN: b.ISBN, Publisher: b.Publisher,
			CoverImageURL: b.CoverImageURL, Status: b.Status, MediaTypes: b.MediaTypes,
			PurchasePlace: b.PurchasePlace, StartedAt: b.StartedAt, CompletedAt: b.CompletedAt,
			Rating: b.Rating, Tags: b.Tags, Memo: b.Memo, GoogleBooksID: b.GoogleBooksID,
		})
	}
	for _, m := range export.Movies {
		CreateMovie(ctx, userID, MovieInput{
			Title: m.Title, SeriesName: m.SeriesName, SeriesOrder: m.SeriesOrder,
			Directors: m.Directors, ReleasedAt: m.ReleasedAt, WatchedAt: m.WatchedAt,
			CoverImageURL: m.CoverImageURL, Status: m.Status, MediaTypes: m.MediaTypes,
			Rating: m.Rating, Tags: m.Tags, Memo: m.Memo, TmdbID: m.TmdbID,
		})
	}
	for _, d := range export.Dramas {
		CreateDrama(ctx, userID, DramaInput{
			Title: d.Title, SeriesName: d.SeriesName, TotalSeasons: d.TotalSeasons,
			FirstSeasonAiredAt: d.FirstSeasonAiredAt, CurrentSeasonAiredAt: d.CurrentSeasonAiredAt,
			WatchStartedAt: d.WatchStartedAt, CurrentSeason: d.CurrentSeason,
			CoverImageURL: d.CoverImageURL, Status: d.Status, MediaTypes: d.MediaTypes,
			Rating: d.Rating, Tags: d.Tags, Memo: d.Memo, TmdbID: d.TmdbID,
		})
	}
	return nil
}
