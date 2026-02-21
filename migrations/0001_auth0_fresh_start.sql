-- Migration: Auth0 Fresh Start
-- Purpose: Drop user-related tables, clear trades, and add Auth0 user columns

-- Drop all foreign key constraints first
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_user_id_users_id_fk;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_users_id_fk;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_user_id_users_id_fk;
ALTER TABLE user_selections DROP CONSTRAINT IF EXISTS user_selections_user_id_users_id_fk;
ALTER TABLE contact_requests DROP CONSTRAINT IF EXISTS contact_requests_from_user_id_users_id_fk;
ALTER TABLE contact_requests DROP CONSTRAINT IF EXISTS contact_requests_to_user_id_users_id_fk;

-- Drop all tables except trades
DROP TABLE IF EXISTS contact_requests CASCADE;
DROP TABLE IF EXISTS user_selections CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Clear existing trades (fresh start)
TRUNCATE TABLE trades;

-- Modify trades table
ALTER TABLE trades DROP COLUMN IF EXISTS user_id;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS auth0_user_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_display_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

-- Update existing columns to ensure NOT NULL
ALTER TABLE trades ALTER COLUMN status SET NOT NULL;
ALTER TABLE trades ALTER COLUMN status SET DEFAULT 'open';