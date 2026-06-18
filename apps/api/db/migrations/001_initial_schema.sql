-- 001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username    VARCHAR(64) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sharing: dashboard
CREATE TABLE dashboard_shares (
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner_id, viewer_id)
);

-- Sharing: ratings (directional)
CREATE TABLE rating_shares (
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (from_user_id, to_user_id)
);

-- Tags
CREATE TABLE tags (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    color       VARCHAR(16),
    UNIQUE (user_id, name)
);

-- User-defined media types
CREATE TABLE user_media_types (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    VARCHAR(16) NOT NULL CHECK (category IN ('book', 'movie', 'drama')),
    name        VARCHAR(64) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, category, name)
);

-- Books
CREATE TABLE books (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    series_name     VARCHAR(256),
    series_order    INTEGER,
    authors         TEXT[] NOT NULL DEFAULT '{}',
    isbn            VARCHAR(32),
    publisher       VARCHAR(256),
    cover_image_url TEXT,
    status          VARCHAR(32) NOT NULL CHECK (status IN ('want_to_read', 'reading', 'completed', 'on_hold')),
    media_types     TEXT[] NOT NULL DEFAULT '{}',
    purchase_place  VARCHAR(256),
    started_at      DATE,
    completed_at    DATE,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    memo            TEXT,
    google_books_id VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE book_tags (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, tag_id)
);

-- Movies
CREATE TABLE movies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    series_name     VARCHAR(256),
    series_order    INTEGER,
    directors       TEXT[] NOT NULL DEFAULT '{}',
    released_at     DATE,
    watched_at      DATE,
    cover_image_url TEXT,
    status          VARCHAR(32) NOT NULL CHECK (status IN ('unwatched', 'watched')),
    media_types     TEXT[] NOT NULL DEFAULT '{}',
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    memo            TEXT,
    tmdb_id         INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movie_tags (
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, tag_id)
);

-- Dramas
CREATE TABLE dramas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                   VARCHAR(512) NOT NULL,
    series_name             VARCHAR(256),
    total_seasons           SMALLINT,
    first_season_aired_at   DATE,
    current_season_aired_at DATE,
    watch_started_at        DATE,
    current_season          SMALLINT,
    cover_image_url         TEXT,
    status                  VARCHAR(32) NOT NULL CHECK (status IN ('interested', 'watching', 'completed', 'dropped')),
    media_types             TEXT[] NOT NULL DEFAULT '{}',
    rating                  SMALLINT CHECK (rating BETWEEN 1 AND 5),
    memo                    TEXT,
    tmdb_id                 INTEGER,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drama_tags (
    drama_id UUID NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (drama_id, tag_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backup config
CREATE TABLE backup_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    interval_days   INTEGER NOT NULL DEFAULT 7,
    max_backups     INTEGER NOT NULL DEFAULT 5,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO backup_config (enabled, interval_days, max_backups) VALUES (FALSE, 7, 5);

-- Indexes
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_movies_user_id ON movies(user_id);
CREATE INDEX idx_dramas_user_id ON dramas(user_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_dramas_status ON dramas(status);
CREATE INDEX idx_books_series ON books(series_name) WHERE series_name IS NOT NULL;
CREATE INDEX idx_movies_series ON movies(series_name) WHERE series_name IS NOT NULL;
