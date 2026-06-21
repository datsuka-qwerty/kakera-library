package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/kakera-library/api/internal/db"
)

type Tag struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Color  *string `json:"color"`
}

func ListTags(ctx context.Context, userID string) ([]Tag, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, name, color FROM tags WHERE user_id=$1 ORDER BY name`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		rows.Scan(&t.ID, &t.Name, &t.Color)
		tags = append(tags, t)
	}
	return tags, nil
}

func CreateTag(ctx context.Context, userID, name string, color *string) (*Tag, error) {
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO tags (id, user_id, name, color) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, name) DO NOTHING`,
		id, userID, name, color,
	)
	if err != nil {
		return nil, err
	}
	var t Tag
	db.Pool.QueryRow(ctx, `SELECT id, name, color FROM tags WHERE user_id=$1 AND name=$2`, userID, name).
		Scan(&t.ID, &t.Name, &t.Color)
	return &t, nil
}

func DeleteTag(ctx context.Context, userID, id string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM tags WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

type MediaType struct {
	ID        string  `json:"id"`
	Category  string  `json:"category"`
	Name      string  `json:"name"`
	IsDefault bool    `json:"isDefault"`
	Key       *string `json:"key"`
}

func ListMediaTypes(ctx context.Context, userID string) ([]MediaType, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, category, name, is_default, key FROM user_media_types WHERE user_id=$1 ORDER BY category, name`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var types []MediaType
	for rows.Next() {
		var m MediaType
		rows.Scan(&m.ID, &m.Category, &m.Name, &m.IsDefault, &m.Key)
		types = append(types, m)
	}
	return types, nil
}

func CreateMediaType(ctx context.Context, userID, category, name string) (*MediaType, error) {
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO user_media_types (id, user_id, category, name) VALUES ($1,$2,$3,$4)
		 ON CONFLICT (user_id, category, name) DO NOTHING`,
		id, userID, category, name,
	)
	if err != nil {
		return nil, err
	}
	var m MediaType
	db.Pool.QueryRow(ctx,
		`SELECT id, category, name, is_default, key FROM user_media_types WHERE user_id=$1 AND category=$2 AND name=$3`,
		userID, category, name,
	).Scan(&m.ID, &m.Category, &m.Name, &m.IsDefault, &m.Key)
	return &m, nil
}

func DeleteMediaType(ctx context.Context, userID, id string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM user_media_types WHERE id=$1 AND user_id=$2 AND is_default=FALSE`, id, userID,
	)
	return err
}
