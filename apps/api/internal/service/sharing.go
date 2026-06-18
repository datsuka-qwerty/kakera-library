package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

type ShareTarget struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
}

func ListDashboardShares(ctx context.Context, ownerID string) ([]ShareTarget, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT u.id, u.username FROM dashboard_shares ds
		JOIN users u ON u.id = ds.viewer_id
		WHERE ds.owner_id = $1`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var targets []ShareTarget
	for rows.Next() {
		var t ShareTarget
		rows.Scan(&t.UserID, &t.Username)
		targets = append(targets, t)
	}
	return targets, nil
}

func SetDashboardShare(ctx context.Context, ownerID, viewerID string) error {
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO dashboard_shares (owner_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
		ownerID, viewerID,
	)
	return err
}

func RemoveDashboardShare(ctx context.Context, ownerID, viewerID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM dashboard_shares WHERE owner_id=$1 AND viewer_id=$2`, ownerID, viewerID,
	)
	return err
}

type RatingShareEntry struct {
	ToUserID   string `json:"toUserId"`
	ToUsername string `json:"toUsername"`
	Enabled    bool   `json:"enabled"`
}

func ListRatingShares(ctx context.Context, fromUserID string) ([]RatingShareEntry, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT u.id, u.username, rs.enabled FROM rating_shares rs
		JOIN users u ON u.id = rs.to_user_id
		WHERE rs.from_user_id = $1`, fromUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []RatingShareEntry
	for rows.Next() {
		var e RatingShareEntry
		rows.Scan(&e.ToUserID, &e.ToUsername, &e.Enabled)
		entries = append(entries, e)
	}
	return entries, nil
}

func SetRatingShare(ctx context.Context, fromUserID, toUserID string, enabled bool) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO rating_shares (from_user_id, to_user_id, enabled)
		VALUES ($1,$2,$3)
		ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET enabled=$3, updated_at=NOW()`,
		fromUserID, toUserID, enabled,
	)
	return err
}

func RemoveRatingShare(ctx context.Context, fromUserID, toUserID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM rating_shares WHERE from_user_id=$1 AND to_user_id=$2`, fromUserID, toUserID,
	)
	return err
}
