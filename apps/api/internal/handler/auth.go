package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func Login(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func RefreshToken(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func Logout(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func SetupTOTP(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func VerifyTOTP(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}

func DisableTOTP(c echo.Context) error {
	return c.JSON(http.StatusNotImplemented, map[string]string{"message": "not implemented"})
}
