package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

func GetRegistrationEnabled(ctx context.Context) (bool, error) {
	var enabled bool
	err := db.Pool.QueryRow(ctx, `SELECT registration_enabled FROM server_settings WHERE id = 1`).Scan(&enabled)
	return enabled, err
}

func SetRegistrationEnabled(ctx context.Context, enabled bool) error {
	_, err := db.Pool.Exec(ctx, `UPDATE server_settings SET registration_enabled = $1 WHERE id = 1`, enabled)
	return err
}
