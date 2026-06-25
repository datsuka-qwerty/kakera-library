package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ListUsers(c echo.Context) error {
	users, err := service.ListUsers(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, users)
}

func CreateUser(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	user, err := service.CreateUser(c.Request().Context(), service.CreateUserInput{
		Username: req.Username,
		Password: req.Password,
		Role:     req.Role,
	})
	if err != nil {
		return c.JSON(http.StatusConflict, errResp("conflict", err.Error()))
	}
	return c.JSON(http.StatusCreated, user)
}

func GetUser(c echo.Context) error {
	user, err := service.GetUser(c.Request().Context(), c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusNotFound, errResp("not_found", "user not found"))
	}
	return c.JSON(http.StatusOK, user)
}

func UpdateUser(c echo.Context) error {
	var req struct {
		AvatarURL *string `json:"avatarUrl"`
		Password  *string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}

	callerID := c.Get("userId").(string)
	callerRole := c.Get("role").(string)
	targetID := c.Param("id")
	if callerID != targetID && callerRole != "admin" {
		return c.JSON(http.StatusForbidden, errResp("forbidden", "cannot update other users"))
	}

	user, err := service.UpdateUser(c.Request().Context(), targetID, service.UpdateUserInput{
		AvatarURL: req.AvatarURL,
		Password:  req.Password,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, user)
}

func DeleteUser(c echo.Context) error {
	if err := service.DeleteUser(c.Request().Context(), c.Param("id")); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}
