package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/kakera-library/api/internal/db"
	"golang.org/x/crypto/bcrypt"
)

var ErrUserNotFound = errors.New("user not found")
var ErrUsernameTaken = errors.New("username already taken")

type User struct {
	ID          string  `json:"id"`
	Username    string  `json:"username"`
	Email       string  `json:"email"`
	Role        string  `json:"role"`
	AvatarURL   *string `json:"avatarUrl"`
	TOTPEnabled bool    `json:"totpEnabled"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

func ListUsers(ctx context.Context) ([]User, error) {
	rows, err := db.Pool.Query(ctx,
		`SELECT id::text, username, email, role, avatar_url, totp_enabled, created_at::text, updated_at::text FROM users ORDER BY created_at`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.AvatarURL, &u.TOTPEnabled, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func GetUser(ctx context.Context, id string) (*User, error) {
	var u User
	err := db.Pool.QueryRow(ctx,
		`SELECT id::text, username, email, role, avatar_url, totp_enabled, created_at::text, updated_at::text FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.AvatarURL, &u.TOTPEnabled, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return &u, nil
}

func GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var u User
	err := db.Pool.QueryRow(ctx,
		`SELECT id::text, username, email, role, avatar_url, totp_enabled, created_at::text, updated_at::text FROM users WHERE username = $1`, username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.AvatarURL, &u.TOTPEnabled, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return &u, nil
}

type CreateUserInput struct {
	Username string
	Email    string
	Password string
	Role     string
}

func CreateUser(ctx context.Context, input CreateUserInput) (*User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	role := input.Role
	if role == "" {
		role = "member"
	}

	id := uuid.New().String()
	_, err = db.Pool.Exec(ctx,
		`INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
		id, input.Username, input.Email, string(hash), role,
	)
	if err != nil {
		return nil, ErrUsernameTaken
	}

	seedDefaultMediaTypes(ctx, id)

	return GetUser(ctx, id)
}

var defaultMediaTypes = []struct {
	category string
	name     string
	key      string
}{
	{"book", "紙媒体", "paper_book"},
	{"book", "電子書籍", "ebook"},
	{"book", "図書館", "library"},
	{"book", "貸出中", "borrowed"},
	{"book", "手放した", "sold"},
	{"movie", "Netflix", ""},
	{"movie", "Amazon Prime", ""},
	{"movie", "FOD", ""},
	{"movie", "U-Next", ""},
	{"movie", "映画館", "theater"},
	{"drama", "Netflix", ""},
	{"drama", "Amazon Prime", ""},
	{"drama", "FOD", ""},
	{"drama", "U-Next", ""},
	{"drama", "テレビ", "tv"},
}

func seedDefaultMediaTypes(ctx context.Context, userID string) {
	for _, m := range defaultMediaTypes {
		var keyVal interface{}
		if m.key != "" {
			keyVal = m.key
		}
		db.Pool.Exec(ctx,
			`INSERT INTO user_media_types (id, user_id, category, name, is_default, key) VALUES ($1,$2,$3,$4,TRUE,$5)
			 ON CONFLICT (user_id, category, name) DO NOTHING`,
			uuid.New().String(), userID, m.category, m.name, keyVal,
		)
	}
}

type UpdateUserInput struct {
	Email     *string
	AvatarURL *string
	Password  *string
}

func UpdateUser(ctx context.Context, id string, input UpdateUserInput) (*User, error) {
	if input.Email != nil {
		db.Pool.Exec(ctx, `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2`, *input.Email, id)
	}
	if input.AvatarURL != nil {
		db.Pool.Exec(ctx, `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`, *input.AvatarURL, id)
	}
	if input.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		db.Pool.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, string(hash), id)
	}
	return GetUser(ctx, id)
}

func DeleteUser(ctx context.Context, id string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}
