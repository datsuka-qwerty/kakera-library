package handler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ListBooks(c echo.Context) error {
	userID := c.Get("userId").(string)
	f := service.ListFilter{
		Search: c.QueryParam("search"),
		Status: c.QueryParam("status"),
	}
	if r := c.QueryParam("rating"); r != "" {
		v, _ := strconv.Atoi(r)
		f.Rating = &v
	}
	f.Page, _ = strconv.Atoi(c.QueryParam("page"))
	f.PerPage, _ = strconv.Atoi(c.QueryParam("perPage"))

	result, err := service.ListBooks(c.Request().Context(), userID, f)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, result)
}

func CreateBook(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title         string   `json:"title"`
		SeriesName    *string  `json:"seriesName"`
		SeriesOrder   *int     `json:"seriesOrder"`
		Authors       []string `json:"authors"`
		ISBN          *string  `json:"isbn"`
		Publisher     *string  `json:"publisher"`
		CoverImageURL *string  `json:"coverImageUrl"`
		Status        string   `json:"status"`
		MediaTypes    []string `json:"mediaTypes"`
		Genres        []string `json:"genres"`
		PurchasePlace *string  `json:"purchasePlace"`
		StartedAt     *string  `json:"startedAt"`
		CompletedAt   *string  `json:"completedAt"`
		Rating        *int     `json:"rating"`
		Tags          []string `json:"tags"`
		Memo          *string  `json:"memo"`
		GoogleBooksID *string  `json:"googleBooksId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	book, err := service.CreateBook(c.Request().Context(), userID, service.BookInput{
		Title: req.Title, SeriesName: req.SeriesName, SeriesOrder: req.SeriesOrder,
		Authors: req.Authors, ISBN: req.ISBN, Publisher: req.Publisher,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, PurchasePlace: req.PurchasePlace, StartedAt: req.StartedAt, CompletedAt: req.CompletedAt,
		Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, GoogleBooksID: req.GoogleBooksID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusCreated, book)
}

func GetBook(c echo.Context) error {
	userID := c.Get("userId").(string)
	book, err := service.GetBook(c.Request().Context(), userID, c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusNotFound, errResp("not_found", "book not found"))
	}
	return c.JSON(http.StatusOK, book)
}

func UpdateBook(c echo.Context) error {
	userID := c.Get("userId").(string)
	var req struct {
		Title         string   `json:"title"`
		SeriesName    *string  `json:"seriesName"`
		SeriesOrder   *int     `json:"seriesOrder"`
		Authors       []string `json:"authors"`
		ISBN          *string  `json:"isbn"`
		Publisher     *string  `json:"publisher"`
		CoverImageURL *string  `json:"coverImageUrl"`
		Status        string   `json:"status"`
		MediaTypes    []string `json:"mediaTypes"`
		Genres        []string `json:"genres"`
		PurchasePlace *string  `json:"purchasePlace"`
		StartedAt     *string  `json:"startedAt"`
		CompletedAt   *string  `json:"completedAt"`
		Rating        *int     `json:"rating"`
		Tags          []string `json:"tags"`
		Memo          *string  `json:"memo"`
		GoogleBooksID *string  `json:"googleBooksId"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	book, err := service.UpdateBook(c.Request().Context(), userID, c.Param("id"), service.BookInput{
		Title: req.Title, SeriesName: req.SeriesName, SeriesOrder: req.SeriesOrder,
		Authors: req.Authors, ISBN: req.ISBN, Publisher: req.Publisher,
		CoverImageURL: req.CoverImageURL, Status: req.Status, MediaTypes: req.MediaTypes,
		Genres: req.Genres, PurchasePlace: req.PurchasePlace, StartedAt: req.StartedAt, CompletedAt: req.CompletedAt,
		Rating: req.Rating, Tags: req.Tags, Memo: req.Memo, GoogleBooksID: req.GoogleBooksID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, book)
}

func DeleteBook(c echo.Context) error {
	userID := c.Get("userId").(string)
	if err := service.DeleteBook(c.Request().Context(), userID, c.Param("id")); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}
