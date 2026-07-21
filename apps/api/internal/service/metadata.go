package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
)

// --- Google Books ---

type BookMeta struct {
	GoogleBooksID string   `json:"googleBooksId"`
	Title         string   `json:"title"`
	Authors       []string `json:"authors"`
	Publisher     *string  `json:"publisher"`
	PublishedAt   *string  `json:"publishedAt"`
	ISBN          *string  `json:"isbn"`
	CoverImageURL *string  `json:"coverImageUrl"`
	Description   *string  `json:"description"`
	Genres        []string `json:"genres"`
}

func SearchBooksMeta(ctx context.Context, query string, page int) ([]BookMeta, error) {
	apiKey := os.Getenv("GOOGLE_BOOKS_API_KEY")
	startIndex := (page - 1) * 10
	u := fmt.Sprintf("https://www.googleapis.com/books/v1/volumes?q=%s&maxResults=10&startIndex=%d&key=%s",
		url.QueryEscape(query), startIndex, apiKey)

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
				PublishedDate       string   `json:"publishedDate"`
				Categories          []string `json:"categories"`
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

	books := make([]BookMeta, 0)
	for _, item := range result.Items {
		authors := item.VolumeInfo.Authors
		if authors == nil {
			authors = []string{}
		}
		genres := item.VolumeInfo.Categories
		if genres == nil {
			genres = []string{}
		}
		b := BookMeta{
			GoogleBooksID: item.ID,
			Title:         item.VolumeInfo.Title,
			Authors:       authors,
			Genres:        genres,
		}
		if item.VolumeInfo.Publisher != "" {
			b.Publisher = &item.VolumeInfo.Publisher
		}
		if item.VolumeInfo.PublishedDate != "" {
			b.PublishedAt = &item.VolumeInfo.PublishedDate
		}
		if item.VolumeInfo.Description != "" {
			b.Description = &item.VolumeInfo.Description
		}
		if item.VolumeInfo.ImageLinks != nil {
			img := strings.Replace(item.VolumeInfo.ImageLinks.Thumbnail, "http://", "https://", 1)
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
	books, err := SearchBooksMeta(ctx, "isbn:"+isbn, 1)
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
	TmdbID        int      `json:"tmdbId"`
	Title         string   `json:"title"`
	CoverImageURL *string  `json:"coverImageUrl"`
	ReleasedAt    *string  `json:"releasedAt"`
	Overview      *string  `json:"overview"`
	Genres        []string `json:"genres"`
	TotalSeasons  *int     `json:"totalSeasons,omitempty"`
	Studios       []string `json:"studios,omitempty"`
	Directors     []string `json:"directors,omitempty"`
	SeriesName    *string  `json:"seriesName,omitempty"`
	Distributors  []string `json:"distributors,omitempty"`
}

const tmdbImageBase = "https://image.tmdb.org/t/p/w500"

var (
	tmdbGenreMu     sync.Mutex
	tmdbMovieGenres map[int]string
	tmdbTVGenres    map[int]string
)

func ensureTMDBGenres(ctx context.Context, mediaType string) map[int]string {
	tmdbGenreMu.Lock()
	defer tmdbGenreMu.Unlock()

	var cache *map[int]string
	if mediaType == "movie" {
		cache = &tmdbMovieGenres
	} else {
		cache = &tmdbTVGenres
	}
	if *cache != nil {
		return *cache
	}

	apiKey := os.Getenv("TMDB_API_KEY")
	u := fmt.Sprintf("https://api.themoviedb.org/3/genre/%s/list?api_key=%s&language=ja-JP", mediaType, apiKey)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var gr struct {
		Genres []struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		} `json:"genres"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil
	}
	m := make(map[int]string, len(gr.Genres))
	for _, g := range gr.Genres {
		m[g.ID] = g.Name
	}
	*cache = m
	return m
}

func SearchMoviesMeta(ctx context.Context, query string, page int) ([]ContentMeta, error) {
	return searchTMDB(ctx, "movie", query, page)
}

func SearchDramasMeta(ctx context.Context, query string, page int) ([]ContentMeta, error) {
	return searchTMDB(ctx, "tv", query, page)
}

func SearchAnimesMeta(ctx context.Context, query string, page int) ([]ContentMeta, error) {
	return searchTMDB(ctx, "tv", query, page)
}

func searchTMDB(ctx context.Context, mediaType, query string, page int) ([]ContentMeta, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	u := fmt.Sprintf("https://api.themoviedb.org/3/search/%s?api_key=%s&query=%s&language=ja-JP&page=%d",
		mediaType, apiKey, url.QueryEscape(query), page)

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
			GenreIDs     []int  `json:"genre_ids"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	genreMap := ensureTMDBGenres(ctx, mediaType)

	contents := make([]ContentMeta, 0, len(result.Results))
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
		for _, gid := range r.GenreIDs {
			if name, ok := genreMap[gid]; ok {
				c.Genres = append(c.Genres, name)
			}
		}
		contents = append(contents, c)
	}

	// For TV shows, fetch seasons/studios/directors (Series Director preferred, fallback to created_by)
	if mediaType == "tv" && len(contents) > 0 {
		type detailResult struct {
			idx       int
			seasons   int
			studios   []string
			directors []string
		}
		ch := make(chan detailResult, len(contents))
		for i, c := range contents {
			go func(idx, id int) {
				u := fmt.Sprintf("https://api.themoviedb.org/3/tv/%d?api_key=%s&append_to_response=credits", id, apiKey)
				req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					ch <- detailResult{idx: idx}
					return
				}
				defer resp.Body.Close()
				var detail struct {
					NumberOfSeasons     int `json:"number_of_seasons"`
					ProductionCompanies []struct {
						Name string `json:"name"`
					} `json:"production_companies"`
					CreatedBy []struct {
						Name string `json:"name"`
					} `json:"created_by"`
					Credits struct {
						Crew []struct {
							Name string `json:"name"`
							Job  string `json:"job"`
						} `json:"crew"`
					} `json:"credits"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
					ch <- detailResult{idx: idx}
					return
				}
				studios := make([]string, 0, len(detail.ProductionCompanies))
				for _, pc := range detail.ProductionCompanies {
					if pc.Name != "" {
						studios = append(studios, pc.Name)
					}
				}
				directors := make([]string, 0)
				for _, crew := range detail.Credits.Crew {
					if crew.Job == "Series Director" && crew.Name != "" {
						directors = append(directors, crew.Name)
					}
				}
				if len(directors) == 0 {
					for _, cb := range detail.CreatedBy {
						if cb.Name != "" {
							directors = append(directors, cb.Name)
						}
					}
				}
				ch <- detailResult{idx: idx, seasons: detail.NumberOfSeasons, studios: studios, directors: directors}
			}(i, c.TmdbID)
		}
		for range contents {
			r := <-ch
			if r.seasons > 0 {
				s := r.seasons
				contents[r.idx].TotalSeasons = &s
			}
			if len(r.studios) > 0 {
				contents[r.idx].Studios = r.studios
			}
			if len(r.directors) > 0 {
				contents[r.idx].Directors = r.directors
			}
		}
	}

	// For movies, fetch production_companies, credits (directors), and belongs_to_collection (series name)
	if mediaType == "movie" && len(contents) > 0 {
		type movieResult struct {
			idx          int
			studios      []string
			directors    []string
			seriesName   *string
			distributors []string
		}
		ch := make(chan movieResult, len(contents))
		for i, c := range contents {
			go func(idx, id int) {
				u := fmt.Sprintf("https://api.themoviedb.org/3/movie/%d?api_key=%s&append_to_response=credits", id, apiKey)
				req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					ch <- movieResult{idx: idx}
					return
				}
				defer resp.Body.Close()
				var detail struct {
					BelongsToCollection *struct {
						Name string `json:"name"`
					} `json:"belongs_to_collection"`
					ProductionCompanies []struct {
						Name string `json:"name"`
					} `json:"production_companies"`
					Credits struct {
						Crew []struct {
							Name string `json:"name"`
							Job  string `json:"job"`
						} `json:"crew"`
					} `json:"credits"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
					ch <- movieResult{idx: idx}
					return
				}
				companies := make([]string, 0, len(detail.ProductionCompanies))
				for _, pc := range detail.ProductionCompanies {
					if pc.Name != "" {
						companies = append(companies, pc.Name)
					}
				}
				directors := make([]string, 0)
				for _, crew := range detail.Credits.Crew {
					if crew.Job == "Director" && crew.Name != "" {
						directors = append(directors, crew.Name)
					}
				}
				var seriesName *string
				if detail.BelongsToCollection != nil && detail.BelongsToCollection.Name != "" {
					seriesName = &detail.BelongsToCollection.Name
				}
				ch <- movieResult{idx: idx, studios: companies, directors: directors, seriesName: seriesName, distributors: companies}
			}(i, c.TmdbID)
		}
		for range contents {
			r := <-ch
			if len(r.studios) > 0 {
				contents[r.idx].Studios = r.studios
			}
			if len(r.directors) > 0 {
				contents[r.idx].Directors = r.directors
			}
			if r.seriesName != nil {
				contents[r.idx].SeriesName = r.seriesName
			}
			if len(r.distributors) > 0 {
				contents[r.idx].Distributors = r.distributors
			}
		}
	}

	return contents, nil
}
