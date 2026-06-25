package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func GetServerSettings(c echo.Context) error {
	enabled, err := service.GetRegistrationEnabled(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"registrationEnabled": enabled,
	})
}

func UpdateServerSettings(c echo.Context) error {
	var req struct {
		RegistrationEnabled bool `json:"registrationEnabled"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	if err := service.SetRegistrationEnabled(c.Request().Context(), req.RegistrationEnabled); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{
		"registrationEnabled": req.RegistrationEnabled,
	})
}
