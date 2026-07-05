package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kakera-library/api/internal/db"
)

func GetImageDir() string {
	if dir := os.Getenv("IMAGE_DIR"); dir != "" {
		return dir
	}
	return "/data/images"
}

// DownloadAndStoreImage downloads an image from rawURL and saves it under GetImageDir().
// Returns "/api/v1/images/<filename>" on success, or rawURL unchanged on any error.
// If rawURL is already a local path it is returned as-is (idempotent).
func DownloadAndStoreImage(ctx context.Context, rawURL string) string {
	if rawURL == "" || strings.HasPrefix(rawURL, "/api/v1/images/") {
		return rawURL
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return rawURL
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return rawURL
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return rawURL
	}

	ext := imageExtFromContentType(resp.Header.Get("Content-Type"))
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(rawURL)))
	filename := hash + ext

	dir := GetImageDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return rawURL
	}

	path := filepath.Join(dir, filename)
	// If already downloaded (same URL → same hash), skip writing.
	if _, statErr := os.Stat(path); statErr == nil {
		return "/api/v1/images/" + filename
	}

	f, err := os.Create(path)
	if err != nil {
		return rawURL
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		os.Remove(path)
		return rawURL
	}

	return "/api/v1/images/" + filename
}

func imageExtFromContentType(ct string) string {
	switch {
	case strings.Contains(ct, "png"):
		return ".png"
	case strings.Contains(ct, "gif"):
		return ".gif"
	case strings.Contains(ct, "webp"):
		return ".webp"
	default:
		return ".jpg"
	}
}

// DeleteImageIfOrphaned removes the image file if no book, movie, or drama still references it.
// Errors are silently ignored — this is best-effort cleanup.
func DeleteImageIfOrphaned(ctx context.Context, imageURL string) {
	if imageURL == "" || !strings.HasPrefix(imageURL, "/api/v1/images/") {
		return
	}

	var count int
	err := db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT id FROM books  WHERE cover_image_url = $1
			UNION ALL
			SELECT id FROM movies WHERE cover_image_url = $1
			UNION ALL
			SELECT id FROM dramas WHERE cover_image_url = $1
		) AS refs
	`, imageURL).Scan(&count)
	if err != nil || count > 0 {
		return
	}

	filename := strings.TrimPrefix(imageURL, "/api/v1/images/")
	os.Remove(filepath.Join(GetImageDir(), filename))
}
