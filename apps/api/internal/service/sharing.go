package service

import (
	"context"

	"github.com/kakera-library/api/internal/db"
)

type SharedRating struct {
	Username string `json:"username"`
	Rating   int    `json:"rating"`
}

// fetchSharers returns userID->username for users who have enabled rating sharing with toUserID.
func fetchSharers(ctx context.Context, toUserID string) (map[string]string, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT rs.from_user_id::text, u.username
		FROM rating_shares rs
		JOIN users u ON u.id = rs.from_user_id
		WHERE rs.to_user_id = $1 AND rs.enabled = true`, toUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string]string{}
	for rows.Next() {
		var uid, uname string
		rows.Scan(&uid, &uname)
		m[uid] = uname
	}
	return m, nil
}

// EnrichBooksWithSharedRatings adds sharedRatings to each Book in-place.
// Match key: google_books_id (preferred) → isbn fallback.
func EnrichBooksWithSharedRatings(ctx context.Context, userID string, books []Book) error {
	sharers, err := fetchSharers(ctx, userID)
	if err != nil || len(sharers) == 0 {
		return err
	}
	sharerIDs := make([]string, 0, len(sharers))
	for id := range sharers {
		sharerIDs = append(sharerIDs, id)
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT user_id::text, google_books_id, isbn, rating FROM books
		 WHERE user_id = ANY($1) AND rating IS NOT NULL`,
		sharerIDs)
	if err != nil {
		return err
	}
	defer rows.Close()

	type sharedBook struct {
		userID        string
		googleBooksID *string
		isbn          *string
		rating        int
	}
	var shared []sharedBook
	for rows.Next() {
		var sb sharedBook
		rows.Scan(&sb.userID, &sb.googleBooksID, &sb.isbn, &sb.rating)
		shared = append(shared, sb)
	}

	for i, b := range books {
		seen := map[string]bool{}
		var ratings []SharedRating
		for _, sb := range shared {
			uname := sharers[sb.userID]
			if seen[uname] {
				continue
			}
			matched := (b.GoogleBooksID != nil && sb.googleBooksID != nil && *b.GoogleBooksID == *sb.googleBooksID) ||
				(b.ISBN != nil && sb.isbn != nil && *b.ISBN == *sb.isbn)
			if matched {
				ratings = append(ratings, SharedRating{Username: uname, Rating: sb.rating})
				seen[uname] = true
			}
		}
		books[i].SharedRatings = ratings
	}
	return nil
}

// EnrichMoviesWithSharedRatings adds sharedRatings to each Movie in-place.
// Match key: tmdb_id.
func EnrichMoviesWithSharedRatings(ctx context.Context, userID string, movies []Movie) error {
	sharers, err := fetchSharers(ctx, userID)
	if err != nil || len(sharers) == 0 {
		return err
	}
	sharerIDs := make([]string, 0, len(sharers))
	for id := range sharers {
		sharerIDs = append(sharerIDs, id)
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT user_id::text, tmdb_id, rating FROM movies
		 WHERE user_id = ANY($1) AND rating IS NOT NULL AND tmdb_id IS NOT NULL`,
		sharerIDs)
	if err != nil {
		return err
	}
	defer rows.Close()

	type sharedMovie struct {
		userID string
		tmdbID int
		rating int
	}
	var shared []sharedMovie
	for rows.Next() {
		var sm sharedMovie
		rows.Scan(&sm.userID, &sm.tmdbID, &sm.rating)
		shared = append(shared, sm)
	}

	for i, m := range movies {
		if m.TmdbID == nil {
			continue
		}
		seen := map[string]bool{}
		var ratings []SharedRating
		for _, sm := range shared {
			uname := sharers[sm.userID]
			if seen[uname] || sm.tmdbID != *m.TmdbID {
				continue
			}
			ratings = append(ratings, SharedRating{Username: uname, Rating: sm.rating})
			seen[uname] = true
		}
		movies[i].SharedRatings = ratings
	}
	return nil
}

// EnrichDramasWithSharedRatings adds sharedRatings to each Drama in-place.
// Match key: tmdb_id.
func EnrichDramasWithSharedRatings(ctx context.Context, userID string, dramas []Drama) error {
	sharers, err := fetchSharers(ctx, userID)
	if err != nil || len(sharers) == 0 {
		return err
	}
	sharerIDs := make([]string, 0, len(sharers))
	for id := range sharers {
		sharerIDs = append(sharerIDs, id)
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT user_id::text, tmdb_id, rating FROM dramas
		 WHERE user_id = ANY($1) AND rating IS NOT NULL AND tmdb_id IS NOT NULL`,
		sharerIDs)
	if err != nil {
		return err
	}
	defer rows.Close()

	type sharedDrama struct {
		userID string
		tmdbID int
		rating int
	}
	var shared []sharedDrama
	for rows.Next() {
		var sd sharedDrama
		rows.Scan(&sd.userID, &sd.tmdbID, &sd.rating)
		shared = append(shared, sd)
	}

	for i, d := range dramas {
		if d.TmdbID == nil {
			continue
		}
		seen := map[string]bool{}
		var ratings []SharedRating
		for _, sd := range shared {
			uname := sharers[sd.userID]
			if seen[uname] || sd.tmdbID != *d.TmdbID {
				continue
			}
			ratings = append(ratings, SharedRating{Username: uname, Rating: sd.rating})
			seen[uname] = true
		}
		dramas[i].SharedRatings = ratings
	}
	return nil
}


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

func ListReceivedDashboardShares(ctx context.Context, viewerID string) ([]ShareTarget, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT u.id::text, u.username FROM dashboard_shares ds
		JOIN users u ON u.id = ds.owner_id
		WHERE ds.viewer_id = $1`, viewerID)
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

func ListUsersForSharing(ctx context.Context, excludeUserID string) ([]ShareTarget, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id::text, username FROM users WHERE id != $1 ORDER BY username`, excludeUserID)
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
	if targets == nil {
		targets = []ShareTarget{}
	}
	return targets, nil
}

func ListReceivedRatingShares(ctx context.Context, toUserID string) ([]ShareTarget, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT u.id::text, u.username FROM rating_shares rs
		JOIN users u ON u.id = rs.from_user_id
		WHERE rs.to_user_id = $1 AND rs.enabled = true`, toUserID)
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
