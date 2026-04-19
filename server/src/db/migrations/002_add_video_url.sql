-- Migration 002: Add video_url to listings
-- Single optional video per listing, stored as a Google Drive embed URL.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS video_url TEXT;
