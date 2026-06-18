package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func ListMovies(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func CreateMovie(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func GetMovie(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func UpdateMovie(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func DeleteMovie(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}
