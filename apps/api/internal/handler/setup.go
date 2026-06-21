package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func GetSetupStatus(c echo.Context) error {
	needsSetup, err := service.NeedsSetup(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]bool{"needsSetup": needsSetup})
}

func RunSetup(c echo.Context) error {
	needsSetup, err := service.NeedsSetup(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	if !needsSetup {
		return c.JSON(http.StatusConflict, errResp("already_setup", "setup already completed"))
	}

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	user, err := service.CreateUser(c.Request().Context(), service.CreateUserInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Role:     "admin",
	})
	if err != nil {
		return c.JSON(http.StatusConflict, errResp("conflict", err.Error()))
	}
	return c.JSON(http.StatusCreated, user)
}
