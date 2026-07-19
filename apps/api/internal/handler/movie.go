package handler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ListMovies(c echo.Context) error {
	userID := c.Get("userId").(string)
	f := service.ListFilter{
		Search: c.QueryParam("search"),
		Status: c.QueryParam("status"),
		Sort:   c.QueryParam("sort"),
		Order:  c.QueryParam("order"),
	}
	if r := c.QueryParam("rating"); r != "" {
		v, _ := strconv.Atoi(r)
		f.Rating = &v
	}
	f.Page, _ = strconv.Atoi(c.QueryParam("page"))
	f.PerPage, _ = strconv.Atoi(c.QueryParam("perPage"))

	result, err := service.ListMovies(c.Request().Context(), userID, f)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, result)
}

func CreateMovie(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title         string   `json:"title"`
		SeriesName    *string  `json:"seriesName"`
		SeriesOrder   *int     `json:"seriesOrder"`
		Directors     []string `json:"directors"`
		ReleasedAt    *string  `json:"releasedAt"`
		WatchedAt     *string  `json:"watchedAt"`
		CoverImageURL *string  `json:"coverImageUrl"`
		Status        string   `json:"status"`
		MediaTypes    []string `json:"mediaTypes"`
		Genres        []string `json:"genres"`
		Rating        *int     `json:"rating"`
		Tags          []string `json:"tags"`
		Memo          *string  `json:"memo"`
		TmdbID        *int     `json:"tmdbId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	movie, err := service.CreateMovie(c.Request().Context(), userID, service.MovieInput{
		Title: req.Title, SeriesName: req.SeriesName, SeriesOrder: req.SeriesOrder,
		Directors: req.Directors, ReleasedAt: req.ReleasedAt, WatchedAt: req.WatchedAt,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, TmdbID: req.TmdbID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusCreated, movie)
}

func GetMovie(c echo.Context) error {
	userID := c.Get("userId").(string)
	movie, err := service.GetMovie(c.Request().Context(), userID, c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusNotFound, errResp("not_found", "movie not found"))
	}
	return c.JSON(http.StatusOK, movie)
}

func UpdateMovie(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title         string   `json:"title"`
		SeriesName    *string  `json:"seriesName"`
		SeriesOrder   *int     `json:"seriesOrder"`
		Directors     []string `json:"directors"`
		ReleasedAt    *string  `json:"releasedAt"`
		WatchedAt     *string  `json:"watchedAt"`
		CoverImageURL *string  `json:"coverImageUrl"`
		Status        string   `json:"status"`
		MediaTypes    []string `json:"mediaTypes"`
		Genres        []string `json:"genres"`
		Rating        *int     `json:"rating"`
		Tags          []string `json:"tags"`
		Memo          *string  `json:"memo"`
		TmdbID        *int     `json:"tmdbId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	movie, err := service.UpdateMovie(c.Request().Context(), userID, c.Param("id"), service.MovieInput{
		Title: req.Title, SeriesName: req.SeriesName, SeriesOrder: req.SeriesOrder,
		Directors: req.Directors, ReleasedAt: req.ReleasedAt, WatchedAt: req.WatchedAt,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, TmdbID: req.TmdbID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, movie)
}

func DeleteMovie(c echo.Context) error {
	userID := c.Get("userId").(string)
	if err := service.DeleteMovie(c.Request().Context(), userID, c.Param("id")); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}
