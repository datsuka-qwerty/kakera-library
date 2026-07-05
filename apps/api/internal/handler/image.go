package handler

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ServeImage(c echo.Context) error {
	filename := c.Param("filename")
	if strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		return c.JSON(http.StatusBadRequest, errResp("invalid_filename", "invalid filename"))
	}
	path := filepath.Join(service.GetImageDir(), filename)
	return c.File(path)
}
