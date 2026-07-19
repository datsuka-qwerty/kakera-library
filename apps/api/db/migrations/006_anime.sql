CREATE TABLE animes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    series_name TEXT,
    total_seasons INT,
    first_season_aired_at DATE,
    current_season_aired_at DATE,
    watch_started_at DATE,
    current_season INT,
    cover_image_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('interested', 'watching', 'completed', 'dropped')),
    media_types TEXT[] NOT NULL DEFAULT '{}',
    genres TEXT[] NOT NULL DEFAULT '{}',
    studios TEXT[] NOT NULL DEFAULT '{}',
    rating INT CHECK (rating BETWEEN 1 AND 5),
    memo TEXT,
    tmdb_id INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE anime_tags (
    anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, tag_id)
);

ALTER TABLE user_media_types DROP CONSTRAINT user_media_types_category_check;
ALTER TABLE user_media_types ADD CONSTRAINT user_media_types_category_check
    CHECK (category IN ('book', 'movie', 'drama', 'anime'));
