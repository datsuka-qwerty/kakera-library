package handler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ListAnimes(c echo.Context) error {
	userID := c.Get("userId").(string)
	f := service.ListFilter{
		Search:   c.QueryParam("search"),
		Status:   c.QueryParam("status"),
		Genre:    c.QueryParam("genre"),
		Tag:      c.QueryParam("tag"),
		Director: c.QueryParam("director"),
		Studio:   c.QueryParam("studio"),
		Sort:     c.QueryParam("sort"),
		Order:    c.QueryParam("order"),
	}
	if r := c.QueryParam("rating"); r != "" {
		v, _ := strconv.Atoi(r)
		f.Rating = &v
	}
	f.Page, _ = strconv.Atoi(c.QueryParam("page"))
	f.PerPage, _ = strconv.Atoi(c.QueryParam("perPage"))

	result, err := service.ListAnimes(c.Request().Context(), userID, f)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, result)
}

func CreateAnime(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title                string   `json:"title"`
		SeriesName           *string  `json:"seriesName"`
		TotalSeasons         *int     `json:"totalSeasons"`
		FirstSeasonAiredAt   *string  `json:"firstSeasonAiredAt"`
		CurrentSeasonAiredAt *string  `json:"currentSeasonAiredAt"`
		WatchStartedAt       *string  `json:"watchStartedAt"`
		CurrentSeason        *int     `json:"currentSeason"`
		CoverImageURL        *string  `json:"coverImageUrl"`
		Status               string   `json:"status"`
		MediaTypes           []string `json:"mediaTypes"`
		Genres               []string `json:"genres"`
		Directors            []string `json:"directors"`
		Studios              []string `json:"studios"`
		Rating               *int     `json:"rating"`
		Tags                 []string `json:"tags"`
		Memo                 *string  `json:"memo"`
		TmdbID               *int     `json:"tmdbId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	anime, err := service.CreateAnime(c.Request().Context(), userID, service.AnimeInput{
		Title: req.Title, SeriesName: req.SeriesName, TotalSeasons: req.TotalSeasons,
		FirstSeasonAiredAt: req.FirstSeasonAiredAt, CurrentSeasonAiredAt: req.CurrentSeasonAiredAt,
		WatchStartedAt: req.WatchStartedAt, CurrentSeason: req.CurrentSeason,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, Directors: req.Directors, Studios: req.Studios,
		Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, TmdbID: req.TmdbID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusCreated, anime)
}

func GetAnime(c echo.Context) error {
	userID := c.Get("userId").(string)
	anime, err := service.GetAnime(c.Request().Context(), userID, c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusNotFound, errResp("not_found", "anime not found"))
	}
	return c.JSON(http.StatusOK, anime)
}

func UpdateAnime(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title                string   `json:"title"`
		SeriesName           *string  `json:"seriesName"`
		TotalSeasons         *int     `json:"totalSeasons"`
		FirstSeasonAiredAt   *string  `json:"firstSeasonAiredAt"`
		CurrentSeasonAiredAt *string  `json:"currentSeasonAiredAt"`
		WatchStartedAt       *string  `json:"watchStartedAt"`
		CurrentSeason        *int     `json:"currentSeason"`
		CoverImageURL        *string  `json:"coverImageUrl"`
		Status               string   `json:"status"`
		MediaTypes           []string `json:"mediaTypes"`
		Genres               []string `json:"genres"`
		Directors            []string `json:"directors"`
		Studios              []string `json:"studios"`
		Rating               *int     `json:"rating"`
		Tags                 []string `json:"tags"`
		Memo                 *string  `json:"memo"`
		TmdbID               *int     `json:"tmdbId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	anime, err := service.UpdateAnime(c.Request().Context(), userID, c.Param("id"), service.AnimeInput{
		Title: req.Title, SeriesName: req.SeriesName, TotalSeasons: req.TotalSeasons,
		FirstSeasonAiredAt: req.FirstSeasonAiredAt, CurrentSeasonAiredAt: req.CurrentSeasonAiredAt,
		WatchStartedAt: req.WatchStartedAt, CurrentSeason: req.CurrentSeason,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, Directors: req.Directors, Studios: req.Studios,
		Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, TmdbID: req.TmdbID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, anime)
}

func DeleteAnime(c echo.Context) error {
	userID := c.Get("userId").(string)
	if err := service.DeleteAnime(c.Request().Context(), userID, c.Param("id")); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}
