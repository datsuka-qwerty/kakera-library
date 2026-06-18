-- Default media types are seeded per-user on first login via application logic.
-- This migration is intentionally a no-op placeholder to document the design:
-- user_media_types.is_default = TRUE rows are created by the API when a new user registers.
SELECT 1;
