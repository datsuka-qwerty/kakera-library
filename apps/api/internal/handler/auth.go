package handler

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

type registerRequest struct {
	Username string `json:"username" validate:"required"`
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

func Register(c echo.Context) error {
	enabled, err := service.GetRegistrationEnabled(c.Request().Context())
	if err != nil || !enabled {
		return c.JSON(http.StatusForbidden, errResp("registration_disabled", "registration is disabled"))
	}

	var req registerRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", "username, email and password are required"))
	}

	user, err := service.CreateUser(c.Request().Context(), service.CreateUserInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Role:     "member",
	})
	if err != nil {
		return c.JSON(http.StatusConflict, errResp("conflict", "username or email already taken"))
	}

	pair, err := service.IssueTokens(c.Request().Context(), user.ID, user.Role)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"accessToken":  pair.AccessToken,
		"refreshToken": pair.RefreshToken,
		"user": map[string]any{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"role":      user.Role,
			"avatarUrl": user.AvatarURL,
		},
	})
}

type loginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
	TOTPCode string `json:"totpCode"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type logoutRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

func Login(c echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	pair, user, err := service.Login(c.Request().Context(), req.Username, req.Password, req.TOTPCode)
	if err != nil {
		if errors.Is(err, service.ErrTOTPRequired) {
			return c.JSON(http.StatusPreconditionRequired, errResp("totp_required", "TOTP code required"))
		}
		return c.JSON(http.StatusUnauthorized, errResp("unauthorized", "invalid credentials"))
	}

	return c.JSON(http.StatusOK, map[string]any{
		"accessToken":  pair.AccessToken,
		"refreshToken": pair.RefreshToken,
		"user": map[string]any{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"role":      user.Role,
			"avatarUrl": user.AvatarURL,
		},
	})
}

func RefreshToken(c echo.Context) error {
	var req refreshRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	pair, err := service.RefreshTokens(c.Request().Context(), req.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, errResp("unauthorized", "invalid refresh token"))
	}

	return c.JSON(http.StatusOK, map[string]any{
		"accessToken":  pair.AccessToken,
		"refreshToken": pair.RefreshToken,
	})
}

func Logout(c echo.Context) error {
	var req logoutRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	service.Logout(c.Request().Context(), req.RefreshToken)
	return c.NoContent(http.StatusNoContent)
}

func SetupTOTP(c echo.Context) error {
	userID := c.Get("userId").(string)
	secret, qrURL, err := service.SetupTOTP(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"secret":   secret,
		"qrCodeUrl": qrURL,
	})
}

func VerifyTOTP(c echo.Context) error {
	var req struct {
		Code string `json:"code" validate:"required"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	userID := c.Get("userId").(string)
	if err := service.VerifyAndEnableTOTP(c.Request().Context(), userID, req.Code); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("invalid_totp", "invalid code"))
	}
	return c.NoContent(http.StatusNoContent)
}

func DisableTOTP(c echo.Context) error {
	userID := c.Get("userId").(string)
	if err := service.DisableTOTP(c.Request().Context(), userID); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func errResp(code, message string) map[string]string {
	return map[string]string{"code": code, "message": message}
}
