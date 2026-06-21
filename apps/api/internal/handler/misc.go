package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

// Tags

func ListTags(c echo.Context) error {
	userID := c.Get("userId").(string)
	tags, err := service.ListTags(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, tags)
}

func CreateTag(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	tag, err := service.CreateTag(c.Request().Context(), userID, req.Name, req.Color)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusCreated, tag)
}

func DeleteTag(c echo.Context) error {
	userID := c.Get("userId").(string)
	service.DeleteTag(c.Request().Context(), userID, c.Param("id"))
	return c.NoContent(http.StatusNoContent)
}

// Media types

func ListMediaTypes(c echo.Context) error {
	userID := c.Get("userId").(string)
	types, err := service.ListMediaTypes(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, types)
}

func CreateMediaType(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Category string `json:"category"`
		Name     string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	mt, err := service.CreateMediaType(c.Request().Context(), userID, req.Category, req.Name)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusCreated, mt)
}

func DeleteMediaType(c echo.Context) error {
	userID := c.Get("userId").(string)
	service.DeleteMediaType(c.Request().Context(), userID, c.Param("id"))
	return c.NoContent(http.StatusNoContent)
}

// Dashboard

func parseDashboardFilter(c echo.Context) service.DashboardFilter {
	period := c.QueryParam("period")
	if period == "" {
		period = "all"
	}
	year, _ := strconv.Atoi(c.QueryParam("year"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	return service.DashboardFilter{Period: period, Year: year, Month: month}
}

func GetDashboardStats(c echo.Context) error {
	userID := c.Get("userId").(string)
	stats, err := service.GetDashboardStats(c.Request().Context(), userID, parseDashboardFilter(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, stats)
}

func GetUserDashboardStats(c echo.Context) error {
	callerID := c.Get("userId").(string)
	username := c.Param("username")

	// Resolve username → UUID. Return 403 (not 404) to prevent username enumeration.
	target, err := service.GetUserByUsername(c.Request().Context(), username)
	if err != nil {
		return c.JSON(http.StatusForbidden, errResp("forbidden", "not allowed to view this dashboard"))
	}

	// Permission check uses UUID internally.
	shares, err := service.ListDashboardShares(c.Request().Context(), target.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	allowed := false
	for _, s := range shares {
		if s.UserID == callerID {
			allowed = true
			break
		}
	}
	if !allowed {
		return c.JSON(http.StatusForbidden, errResp("forbidden", "not allowed to view this dashboard"))
	}

	stats, err := service.GetDashboardStats(c.Request().Context(), target.ID, parseDashboardFilter(c))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, stats)
}

// External metadata

func SearchBooks(c echo.Context) error {
	q := c.QueryParam("q")
	books, err := service.SearchBooksMeta(c.Request().Context(), q)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, books)
}

func SearchMovies(c echo.Context) error {
	q := c.QueryParam("q")
	movies, err := service.SearchMoviesMeta(c.Request().Context(), q)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, movies)
}

func SearchDramas(c echo.Context) error {
	q := c.QueryParam("q")
	dramas, err := service.SearchDramasMeta(c.Request().Context(), q)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, dramas)
}

func LookupBarcode(c echo.Context) error {
	isbn := c.Param("isbn")
	book, err := service.LookupISBN(c.Request().Context(), isbn)
	if err != nil {
		return c.JSON(http.StatusNotFound, errResp("not_found", "book not found"))
	}
	return c.JSON(http.StatusOK, book)
}

// Backup

func GetBackupConfig(c echo.Context) error {
	cfg, err := service.GetBackupConfig(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, cfg)
}

func UpdateBackupConfig(c echo.Context) error {
	var cfg service.BackupConfig
	if err := c.Bind(&cfg); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	if err := service.UpdateBackupConfig(c.Request().Context(), cfg); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, cfg)
}

func ListBackups(c echo.Context) error {
	files, err := service.ListBackups()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, files)
}

func RunBackup(c echo.Context) error {
	filename, err := service.RunBackup(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]string{"filename": filename})
}

func RestoreBackup(c echo.Context) error {
	if err := service.RestoreBackup(c.Request().Context(), c.Param("filename")); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

// Export / Import

func Export(c echo.Context) error {
	userID := c.Get("userId").(string)
	data, err := service.ExportUserData(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	c.Response().Header().Set("Content-Disposition", "attachment; filename=kakera-export.json")
	return c.JSON(http.StatusOK, data)
}

func Import(c echo.Context) error {
	userID := c.Get("userId").(string)
	mode := c.QueryParam("mode")
	switch mode {
	case "replace", "merge-skip", "merge-overwrite":
	default:
		mode = "merge-skip"
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", "file is required"))
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	defer src.Close()

	var raw json.RawMessage
	if err := json.NewDecoder(src).Decode(&raw); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", "invalid JSON file"))
	}

	result, err := service.ImportUserData(c.Request().Context(), userID, raw, mode)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	return c.JSON(http.StatusOK, result)
}
