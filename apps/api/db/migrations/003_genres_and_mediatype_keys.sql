ALTER TABLE books  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE movies ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE dramas ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE user_media_types ADD COLUMN IF NOT EXISTS key VARCHAR(64);

-- Back-fill keys for every user's default media types
UPDATE user_media_types SET key = 'paper_book' WHERE is_default = TRUE AND category = 'book'  AND name = '紙媒体';
UPDATE user_media_types SET key = 'ebook'      WHERE is_default = TRUE AND category = 'book'  AND name = '電子書籍';
UPDATE user_media_types SET key = 'library'    WHERE is_default = TRUE AND category = 'book'  AND name = '図書館';
UPDATE user_media_types SET key = 'borrowed'   WHERE is_default = TRUE AND category = 'book'  AND name = '貸出中';
UPDATE user_media_types SET key = 'sold'       WHERE is_default = TRUE AND category = 'book'  AND name = '手放した';
UPDATE user_media_types SET key = 'theater'    WHERE is_default = TRUE AND category = 'movie' AND name = '映画館';
UPDATE user_media_types SET key = 'tv'         WHERE is_default = TRUE AND category = 'drama' AND name = 'テレビ';
