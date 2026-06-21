package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

func NeedsSetup(ctx context.Context) (bool, error) {
	var count int
	if err := db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		return false, err
	}
	return count == 0, nil
}
