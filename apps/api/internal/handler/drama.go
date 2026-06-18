package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func ListDramas(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func CreateDrama(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func GetDrama(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func UpdateDrama(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func DeleteDrama(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}
