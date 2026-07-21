package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func GetBookOptions(c echo.Context) error {
	userID := c.Get("userId").(string)
	return c.JSON(http.StatusOK, service.GetBookFilterOptions(c.Request().Context(), userID))
}

func GetMovieOptions(c echo.Context) error {
	userID := c.Get("userId").(string)
	return c.JSON(http.StatusOK, service.GetMovieFilterOptions(c.Request().Context(), userID))
}

func GetDramaOptions(c echo.Context) error {
	userID := c.Get("userId").(string)
	return c.JSON(http.StatusOK, service.GetDramaFilterOptions(c.Request().Context(), userID))
}

func GetAnimeOptions(c echo.Context) error {
	userID := c.Get("userId").(string)
	return c.JSON(http.StatusOK, service.GetAnimeFilterOptions(c.Request().Context(), userID))
}
