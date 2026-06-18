package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/kakera-library/api/internal/db"
	"github.com/kakera-library/api/internal/server"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	ctx := context.Background()

	if err := db.Connect(ctx); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(ctx, "db/migrations"); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Database migrations applied")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	s := server.New()
	log.Printf("Starting Kakera Library API on port %s", port)
	if err := s.Start(":" + port); err != nil {
		log.Fatal(err)
	}
}
