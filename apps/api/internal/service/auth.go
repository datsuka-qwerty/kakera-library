package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kakera-library/api/internal/db"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTOTPRequired       = errors.New("totp required")
	ErrInvalidTOTP        = errors.New("invalid totp code")
	ErrInvalidToken       = errors.New("invalid token")
)

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type UserRecord struct {
	ID           string
	Username     string
	Email        string
	Role         string
	TOTPEnabled  bool
	TOTPSecret   *string
	PasswordHash string
}

func Login(ctx context.Context, username, password, totpCode string) (*TokenPair, *UserRecord, error) {
	var u UserRecord
	err := db.Pool.QueryRow(ctx,
		`SELECT id, username, email, role, password_hash, totp_enabled, totp_secret
		 FROM users WHERE username = $1`, username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.PasswordHash, &u.TOTPEnabled, &u.TOTPSecret)
	if err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	if u.TOTPEnabled {
		if totpCode == "" {
			return nil, nil, ErrTOTPRequired
		}
		if u.TOTPSecret == nil || !totp.Validate(totpCode, *u.TOTPSecret) {
			return nil, nil, ErrInvalidTOTP
		}
	}

	pair, err := issueTokenPair(ctx, u.ID, u.Role)
	if err != nil {
		return nil, nil, err
	}
	return pair, &u, nil
}

func RefreshTokens(ctx context.Context, rawRefreshToken string) (*TokenPair, error) {
	hash := hashToken(rawRefreshToken)

	var userID, role string
	var expiresAt time.Time
	err := db.Pool.QueryRow(ctx,
		`SELECT u.id, u.role, rt.expires_at
		 FROM refresh_tokens rt
		 JOIN users u ON u.id = rt.user_id
		 WHERE rt.token_hash = $1`, hash,
	).Scan(&userID, &role, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		return nil, ErrInvalidToken
	}

	// rotate: delete old token
	db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, hash)

	return issueTokenPair(ctx, userID, role)
}

func Logout(ctx context.Context, rawRefreshToken string) error {
	hash := hashToken(rawRefreshToken)
	_, err := db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, hash)
	return err
}

func SetupTOTP(ctx context.Context, userID string) (secret, qrURL string, err error) {
	var username, email string
	if err = db.Pool.QueryRow(ctx,
		`SELECT username, email FROM users WHERE id = $1`, userID,
	).Scan(&username, &email); err != nil {
		return
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Kakera Library",
		AccountName: email,
	})
	if err != nil {
		return
	}

	_, err = db.Pool.Exec(ctx,
		`UPDATE users SET totp_secret = $1, totp_enabled = FALSE, updated_at = NOW() WHERE id = $2`,
		key.Secret(), userID,
	)
	return key.Secret(), key.URL(), err
}

func VerifyAndEnableTOTP(ctx context.Context, userID, code string) error {
	var secret *string
	if err := db.Pool.QueryRow(ctx,
		`SELECT totp_secret FROM users WHERE id = $1`, userID,
	).Scan(&secret); err != nil || secret == nil {
		return errors.New("totp not set up")
	}

	if !totp.Validate(code, *secret) {
		return ErrInvalidTOTP
	}

	_, err := db.Pool.Exec(ctx,
		`UPDATE users SET totp_enabled = TRUE, updated_at = NOW() WHERE id = $1`, userID,
	)
	return err
}

func DisableTOTP(ctx context.Context, userID string) error {
	_, err := db.Pool.Exec(ctx,
		`UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, updated_at = NOW() WHERE id = $1`, userID,
	)
	return err
}

func issueTokenPair(ctx context.Context, userID, role string) (*TokenPair, error) {
	accessTTL, _ := time.ParseDuration(getenv("JWT_ACCESS_TTL", "15m"))
	refreshTTL, _ := time.ParseDuration(getenv("JWT_REFRESH_TTL", "168h")) // 7d

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"role":   role,
		"exp":    time.Now().Add(accessTTL).Unix(),
	}).SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return nil, err
	}

	rawRefresh := make([]byte, 32)
	if _, err := rand.Read(rawRefresh); err != nil {
		return nil, err
	}
	rawRefreshStr := hex.EncodeToString(rawRefresh)
	hash := hashToken(rawRefreshStr)

	_, err = db.Pool.Exec(ctx,
		`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		uuid.New().String(), userID, hash, time.Now().Add(refreshTTL),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return &TokenPair{AccessToken: accessToken, RefreshToken: rawRefreshStr}, nil
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
