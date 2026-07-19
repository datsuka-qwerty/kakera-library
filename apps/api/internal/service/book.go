package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/kakera-library/api/internal/db"
)

var ErrBookNotFound = errors.New("book not found")

type Book struct {
	ID             string         `json:"id"`
	UserID         string         `json:"userId"`
	Title          string         `json:"title"`
	SeriesName     *string        `json:"seriesName"`
	SeriesOrder    *int           `json:"seriesOrder"`
	Authors        []string       `json:"authors"`
	ISBN           *string        `json:"isbn"`
	Publisher      *string        `json:"publisher"`
	PublishedAt    *string        `json:"publishedAt"`
	CoverImageURL  *string        `json:"coverImageUrl"`
	Status         string         `json:"status"`
	MediaTypes     []string       `json:"mediaTypes"`
	Genres         []string       `json:"genres"`
	PurchasePlace  *string        `json:"purchasePlace"`
	StartedAt      *string        `json:"startedAt"`
	CompletedAt    *string        `json:"completedAt"`
	Rating         *int           `json:"rating"`
	Tags           []string       `json:"tags"`
	Memo           *string        `json:"memo"`
	GoogleBooksID  *string        `json:"googleBooksId"`
	CreatedAt      string         `json:"createdAt"`
	UpdatedAt      string         `json:"updatedAt"`
	SharedRatings  []SharedRating `json:"sharedRatings"`
}

type BookListResult struct {
	Data    []Book `json:"data"`
	Total   int    `json:"total"`
	Page    int    `json:"page"`
	PerPage int    `json:"perPage"`
}

func ListBooks(ctx context.Context, userID string, f ListFilter) (*BookListResult, error) {
	f.defaults()
	where, args := buildWhere(userID, "books", f)

	var total int
	db.Pool.QueryRow(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM books WHERE %s`, where), args...).Scan(&total)

	args = append(args, f.PerPage, f.offset())
	rows, err := db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT books.id, books.user_id, books.title, books.series_name, books.series_order, books.authors,
		       books.isbn, books.publisher, books.published_at::text, books.cover_image_url, books.status, books.media_types,
		       books.genres, books.purchase_place, books.started_at::text, books.completed_at::text,
		       books.rating, books.memo, books.google_books_id, books.created_at::text, books.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM books
		LEFT JOIN book_tags bt ON bt.book_id = books.id
		LEFT JOIN tags t ON t.id = bt.tag_id
		WHERE %s
		GROUP BY books.id
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, f.sortClause("books"), len(args)-1, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	books, err := scanBooks(rows)
	if err != nil {
		return nil, err
	}
	EnrichBooksWithSharedRatings(ctx, userID, books)
	return &BookListResult{Data: books, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

func GetBook(ctx context.Context, userID, id string) (*Book, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT b.id, b.user_id, b.title, b.series_name, b.series_order, b.authors,
		       b.isbn, b.publisher, b.published_at::text, b.cover_image_url, b.status, b.media_types,
		       b.genres, b.purchase_place, b.started_at::text, b.completed_at::text,
		       b.rating, b.memo, b.google_books_id, b.created_at::text, b.updated_at::text,
		       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
		FROM books b
		LEFT JOIN book_tags bt ON bt.book_id = b.id
		LEFT JOIN tags t ON t.id = bt.tag_id
		WHERE b.id = $1 AND b.user_id = $2
		GROUP BY b.id
	`, id, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	books, err := scanBooks(rows)
	if err != nil || len(books) == 0 {
		return nil, ErrBookNotFound
	}
	EnrichBooksWithSharedRatings(ctx, userID, books)
	return &books[0], nil
}

type BookInput struct {
	Title         string
	SeriesName    *string
	SeriesOrder   *int
	Authors       []string
	ISBN          *string
	Publisher     *string
	PublishedAt   *string
	CoverImageURL *string
	Status        string
	MediaTypes    []string
	Genres        []string
	PurchasePlace *string
	StartedAt     *string
	CompletedAt   *string
	Rating        *int
	Tags          []string
	Memo          *string
	GoogleBooksID *string
}

func CreateBook(ctx context.Context, userID string, input BookInput) (*Book, error) {
	if input.CoverImageURL != nil && *input.CoverImageURL != "" {
		stored := DownloadAndStoreImage(ctx, *input.CoverImageURL)
		input.CoverImageURL = &stored
	}
	id := uuid.New().String()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO books (id, user_id, title, series_name, series_order, authors, isbn, publisher, published_at,
		  cover_image_url, status, media_types, genres, purchase_place, started_at, completed_at,
		  rating, memo, google_books_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
	`, id, userID, input.Title, input.SeriesName, input.SeriesOrder, input.Authors,
		input.ISBN, input.Publisher, input.PublishedAt, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Genres, input.PurchasePlace, input.StartedAt, input.CompletedAt, input.Rating, input.Memo, input.GoogleBooksID,
	)
	if err != nil {
		return nil, err
	}
	if err := syncBookTags(ctx, userID, id, input.Tags); err != nil {
		return nil, err
	}
	return GetBook(ctx, userID, id)
}

func UpdateBook(ctx context.Context, userID, id string, input BookInput) (*Book, error) {
	var oldURL string
	db.Pool.QueryRow(ctx, `SELECT COALESCE(cover_image_url,'') FROM books WHERE id=$1 AND user_id=$2`, id, userID).Scan(&oldURL)

	if input.CoverImageURL != nil && *input.CoverImageURL != "" {
		stored := DownloadAndStoreImage(ctx, *input.CoverImageURL)
		input.CoverImageURL = &stored
	}

	_, err := db.Pool.Exec(ctx, `
		UPDATE books SET
		  title=$3, series_name=$4, series_order=$5, authors=$6, isbn=$7, publisher=$8, published_at=$9,
		  cover_image_url=$10, status=$11, media_types=$12, genres=$13, purchase_place=$14,
		  started_at=$15, completed_at=$16, rating=$17, memo=$18, google_books_id=$19,
		  updated_at=NOW()
		WHERE id=$1 AND user_id=$2
	`, id, userID, input.Title, input.SeriesName, input.SeriesOrder, input.Authors,
		input.ISBN, input.Publisher, input.PublishedAt, input.CoverImageURL, input.Status, input.MediaTypes,
		input.Genres, input.PurchasePlace, input.StartedAt, input.CompletedAt, input.Rating, input.Memo, input.GoogleBooksID,
	)
	if err != nil {
		return nil, err
	}
	if err := syncBookTags(ctx, userID, id, input.Tags); err != nil {
		return nil, err
	}

	newURL := ""
	if input.CoverImageURL != nil {
		newURL = *input.CoverImageURL
	}
	if oldURL != newURL {
		DeleteImageIfOrphaned(ctx, oldURL)
	}

	return GetBook(ctx, userID, id)
}

func DeleteBook(ctx context.Context, userID, id string) error {
	var oldURL string
	db.Pool.QueryRow(ctx, `SELECT COALESCE(cover_image_url,'') FROM books WHERE id=$1 AND user_id=$2`, id, userID).Scan(&oldURL)

	_, err := db.Pool.Exec(ctx, `DELETE FROM books WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	DeleteImageIfOrphaned(ctx, oldURL)
	return nil
}

func syncBookTags(ctx context.Context, userID, bookID string, tagNames []string) error {
	db.Pool.Exec(ctx, `DELETE FROM book_tags WHERE book_id=$1`, bookID)
	for _, name := range tagNames {
		var tagID string
		err := db.Pool.QueryRow(ctx,
			`SELECT id FROM tags WHERE user_id=$1 AND name=$2`, userID, name,
		).Scan(&tagID)
		if err != nil {
			tagID = uuid.New().String()
			db.Pool.Exec(ctx, `INSERT INTO tags (id, user_id, name) VALUES ($1,$2,$3)`, tagID, userID, name)
		}
		db.Pool.Exec(ctx, `INSERT INTO book_tags (book_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, bookID, tagID)
	}
	return nil
}

func scanBooks(rows pgx.Rows) ([]Book, error) {
	books := make([]Book, 0)
	for rows.Next() {
		var b Book
		if err := rows.Scan(
			&b.ID, &b.UserID, &b.Title, &b.SeriesName, &b.SeriesOrder, &b.Authors,
			&b.ISBN, &b.Publisher, &b.PublishedAt, &b.CoverImageURL, &b.Status, &b.MediaTypes,
			&b.Genres, &b.PurchasePlace, &b.StartedAt, &b.CompletedAt,
			&b.Rating, &b.Memo, &b.GoogleBooksID, &b.CreatedAt, &b.UpdatedAt, &b.Tags,
		); err != nil {
			return nil, err
		}
		books = append(books, b)
	}
	return books, nil
}
