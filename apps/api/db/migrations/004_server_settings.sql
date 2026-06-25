-- 004_server_settings.sql

CREATE TABLE server_settings (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO server_settings (id, registration_enabled) VALUES (1, false);
