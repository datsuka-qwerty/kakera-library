package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/kakera-library/api/internal/service"
)

func ListDashboardShares(c echo.Context) error {
	userID := c.Get("userId").(string)
	shares, err := service.ListDashboardShares(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, shares)
}

func SetDashboardShare(c echo.Context) error {
	ownerID := c.Get("userId").(string)
	viewerID := c.Param("targetUserId")
	if err := service.SetDashboardShare(c.Request().Context(), ownerID, viewerID); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func RemoveDashboardShare(c echo.Context) error {
	ownerID := c.Get("userId").(string)
	viewerID := c.Param("targetUserId")
	if err := service.RemoveDashboardShare(c.Request().Context(), ownerID, viewerID); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func ListRatingShares(c echo.Context) error {
	userID := c.Get("userId").(string)
	shares, err := service.ListRatingShares(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, shares)
}

func SetRatingShare(c echo.Context) error {
	fromID := c.Get("userId").(string)
	toID := c.Param("targetUserId")
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errResp("bad_request", err.Error()))
	}
	if err := service.SetRatingShare(c.Request().Context(), fromID, toID, req.Enabled); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func RemoveRatingShare(c echo.Context) error {
	fromID := c.Get("userId").(string)
	toID := c.Param("targetUserId")
	if err := service.RemoveRatingShare(c.Request().Context(), fromID, toID); err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func ListUsersForSharing(c echo.Context) error {
	currentUserID := c.Get("userId").(string)
	users, err := service.ListUsersForSharing(c.Request().Context(), currentUserID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	return c.JSON(http.StatusOK, users)
}

func ListReceivedShares(c echo.Context) error {
	viewerID := c.Get("userId").(string)
	dashOwners, err := service.ListReceivedDashboardShares(c.Request().Context(), viewerID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	ratingSharers, err := service.ListReceivedRatingShares(c.Request().Context(), viewerID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errResp("internal", err.Error()))
	}
	if dashOwners == nil {
		dashOwners = []service.ShareTarget{}
	}
	if ratingSharers == nil {
		ratingSharers = []service.ShareTarget{}
	}
	return c.JSON(http.StatusOK, map[string]any{
		"dashboardOwners": dashOwners,
		"ratingSharers":   ratingSharers,
	})
}
