package server

import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/kakera-library/api/internal/handler"
	apimiddleware "github.com/kakera-library/api/internal/middleware"
)

func New() *echo.Echo {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{os.Getenv("CORS_ORIGIN")},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderAuthorization, echo.HeaderContentType},
	}))

	registerRoutes(e)
	return e
}

func registerRoutes(e *echo.Echo) {
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	v1 := e.Group("/api/v1")

	// Setup (public — only functional when no users exist)
	v1.GET("/setup", handler.GetSetupStatus)
	v1.POST("/setup", handler.RunSetup)

	// Server settings (public read, admin write)
	v1.GET("/server-settings", handler.GetServerSettings)
	v1.PUT("/server-settings", handler.UpdateServerSettings, apimiddleware.JWT(), apimiddleware.AdminOnly())

	// Auth
	auth := v1.Group("/auth")
	auth.POST("/login", handler.Login)
	auth.POST("/register", handler.Register)
	auth.POST("/refresh", handler.RefreshToken)
	auth.POST("/logout", handler.Logout)

	// TOTP
	auth.POST("/totp/setup", handler.SetupTOTP, apimiddleware.JWT())
	auth.POST("/totp/verify", handler.VerifyTOTP, apimiddleware.JWT())
	auth.DELETE("/totp", handler.DisableTOTP, apimiddleware.JWT())

	// Users (admin only)
	users := v1.Group("/users", apimiddleware.JWT())
	users.GET("", handler.ListUsers, apimiddleware.AdminOnly())
	users.POST("", handler.CreateUser, apimiddleware.AdminOnly())
	users.GET("/:id", handler.GetUser)
	users.PUT("/:id", handler.UpdateUser)
	users.DELETE("/:id", handler.DeleteUser, apimiddleware.AdminOnly())

	// Sharing
	sharing := v1.Group("/sharing", apimiddleware.JWT())
	sharing.GET("/users", handler.ListUsersForSharing)
	sharing.GET("/dashboard", handler.ListDashboardShares)
	sharing.POST("/dashboard/:targetUserId", handler.SetDashboardShare)
	sharing.DELETE("/dashboard/:targetUserId", handler.RemoveDashboardShare)
	sharing.GET("/ratings", handler.ListRatingShares)
	sharing.POST("/ratings/:targetUserId", handler.SetRatingShare)
	sharing.DELETE("/ratings/:targetUserId", handler.RemoveRatingShare)
	sharing.GET("/received", handler.ListReceivedShares)

	// Books
	books := v1.Group("/books", apimiddleware.JWT())
	books.GET("", handler.ListBooks)
	books.POST("", handler.CreateBook)
	books.GET("/options", handler.GetBookOptions)
	books.GET("/:id", handler.GetBook)
	books.PUT("/:id", handler.UpdateBook)
	books.DELETE("/:id", handler.DeleteBook)

	// Movies
	movies := v1.Group("/movies", apimiddleware.JWT())
	movies.GET("", handler.ListMovies)
	movies.POST("", handler.CreateMovie)
	movies.GET("/options", handler.GetMovieOptions)
	movies.GET("/:id", handler.GetMovie)
	movies.PUT("/:id", handler.UpdateMovie)
	movies.DELETE("/:id", handler.DeleteMovie)

	// Dramas
	dramas := v1.Group("/dramas", apimiddleware.JWT())
	dramas.GET("", handler.ListDramas)
	dramas.POST("", handler.CreateDrama)
	dramas.GET("/options", handler.GetDramaOptions)
	dramas.GET("/:id", handler.GetDrama)
	dramas.PUT("/:id", handler.UpdateDrama)
	dramas.DELETE("/:id", handler.DeleteDrama)

	// Animes
	animes := v1.Group("/animes", apimiddleware.JWT())
	animes.GET("", handler.ListAnimes)
	animes.POST("", handler.CreateAnime)
	animes.GET("/options", handler.GetAnimeOptions)
	animes.GET("/:id", handler.GetAnime)
	animes.PUT("/:id", handler.UpdateAnime)
	animes.DELETE("/:id", handler.DeleteAnime)

	// Tags
	tags := v1.Group("/tags", apimiddleware.JWT())
	tags.GET("", handler.ListTags)
	tags.POST("", handler.CreateTag)
	tags.DELETE("/:id", handler.DeleteTag)

	// Media types (user-defined)
	mediaTypes := v1.Group("/media-types", apimiddleware.JWT())
	mediaTypes.GET("", handler.ListMediaTypes)
	mediaTypes.POST("", handler.CreateMediaType)
	mediaTypes.DELETE("/:id", handler.DeleteMediaType)

	// Dashboard stats
	v1.GET("/dashboard/stats", handler.GetDashboardStats, apimiddleware.JWT())
	v1.GET("/dashboard/stats/:username", handler.GetUserDashboardStats, apimiddleware.JWT())

	// Serve locally stored cover images (public — no auth required)
	v1.GET("/images/:filename", handler.ServeImage)

	// External metadata search
	meta := v1.Group("/metadata", apimiddleware.JWT())
	meta.GET("/books", handler.SearchBooks)
	meta.GET("/movies", handler.SearchMovies)
	meta.GET("/dramas", handler.SearchDramas)
	meta.GET("/animes", handler.SearchAnimes)

	// Barcode lookup
	meta.GET("/barcode/:isbn", handler.LookupBarcode)

	// Admin: backup management
	admin := v1.Group("/admin", apimiddleware.JWT(), apimiddleware.AdminOnly())
	admin.GET("/backup/config", handler.GetBackupConfig)
	admin.PUT("/backup/config", handler.UpdateBackupConfig)
	admin.GET("/backup/list", handler.ListBackups)
	admin.POST("/backup/run", handler.RunBackup)
	admin.POST("/backup/restore/:filename", handler.RestoreBackup)

	// Export / Import
	v1.GET("/export", handler.Export, apimiddleware.JWT())
	v1.POST("/import", handler.Import, apimiddleware.JWT())
}
