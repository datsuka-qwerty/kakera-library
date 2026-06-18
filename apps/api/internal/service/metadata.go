package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

// --- Google Books ---

type BookMeta struct {
	GoogleBooksID string   `json:"googleBooksId"`
	Title         string   `json:"title"`
	Authors       []string `json:"authors"`
	Publisher     *string  `json:"publisher"`
	ISBN          *string  `json:"isbn"`
	CoverImageURL *string  `json:"coverImageUrl"`
	Description   *string  `json:"description"`
}

func SearchBooksMeta(ctx context.Context, query string) ([]BookMeta, error) {
	apiKey := os.Getenv("GOOGLE_BOOKS_API_KEY")
	u := fmt.Sprintf("https://www.googleapis.com/books/v1/volumes?q=%s&maxResults=10&key=%s",
		url.QueryEscape(query), apiKey)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Items []struct {
			ID         string `json:"id"`
			VolumeInfo struct {
				Title               string   `json:"title"`
				Authors             []string `json:"authors"`
				Publisher           string   `json:"publisher"`
				IndustryIdentifiers []struct {
					Type       string `json:"type"`
					Identifier string `json:"identifier"`
				} `json:"industryIdentifiers"`
				ImageLinks *struct {
					Thumbnail string `json:"thumbnail"`
				} `json:"imageLinks"`
				Description string `json:"description"`
			} `json:"volumeInfo"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var books []BookMeta
	for _, item := range result.Items {
		b := BookMeta{
			GoogleBooksID: item.ID,
			Title:         item.VolumeInfo.Title,
			Authors:       item.VolumeInfo.Authors,
		}
		if item.VolumeInfo.Publisher != "" {
			b.Publisher = &item.VolumeInfo.Publisher
		}
		if item.VolumeInfo.Description != "" {
			b.Description = &item.VolumeInfo.Description
		}
		if item.VolumeInfo.ImageLinks != nil {
			img := item.VolumeInfo.ImageLinks.Thumbnail
			b.CoverImageURL = &img
		}
		for _, id := range item.VolumeInfo.IndustryIdentifiers {
			if id.Type == "ISBN_13" || id.Type == "ISBN_10" {
				isbn := id.Identifier
				b.ISBN = &isbn
				break
			}
		}
		books = append(books, b)
	}
	return books, nil
}

func LookupISBN(ctx context.Context, isbn string) (*BookMeta, error) {
	books, err := SearchBooksMeta(ctx, "isbn:"+isbn)
	if err != nil {
		return nil, err
	}
	if len(books) == 0 {
		return nil, fmt.Errorf("book not found")
	}
	return &books[0], nil
}

// --- TMDB ---

type ContentMeta struct {
	TmdbID        int     `json:"tmdbId"`
	Title         string  `json:"title"`
	CoverImageURL *string `json:"coverImageUrl"`
	ReleasedAt    *string `json:"releasedAt"`
	Overview      *string `json:"overview"`
}

const tmdbImageBase = "https://image.tmdb.org/t/p/w500"

func SearchMoviesMeta(ctx context.Context, query string) ([]ContentMeta, error) {
	return searchTMDB(ctx, "movie", query)
}

func SearchDramasMeta(ctx context.Context, query string) ([]ContentMeta, error) {
	return searchTMDB(ctx, "tv", query)
}

func searchTMDB(ctx context.Context, mediaType, query string) ([]ContentMeta, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	u := fmt.Sprintf("https://api.themoviedb.org/3/search/%s?api_key=%s&query=%s&language=ja-JP",
		mediaType, apiKey, url.QueryEscape(query))

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Results []struct {
			ID           int    `json:"id"`
			Title        string `json:"title"`
			Name         string `json:"name"` // TV shows use "name"
			PosterPath   string `json:"poster_path"`
			ReleaseDate  string `json:"release_date"`
			FirstAirDate string `json:"first_air_date"`
			Overview     string `json:"overview"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var contents []ContentMeta
	for _, r := range result.Results {
		title := r.Title
		if title == "" {
			title = r.Name
		}
		date := r.ReleaseDate
		if date == "" {
			date = r.FirstAirDate
		}
		c := ContentMeta{TmdbID: r.ID, Title: title}
		if date != "" {
			c.ReleasedAt = &date
		}
		if r.PosterPath != "" {
			img := tmdbImageBase + r.PosterPath
			c.CoverImageURL = &img
		}
		if r.Overview != "" {
			c.Overview = &r.Overview
		}
		contents = append(contents, c)
	}
	return contents, nil
}
