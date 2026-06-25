-- 005_remove_email.sql
ALTER TABLE users DROP COLUMN IF EXISTS email;
