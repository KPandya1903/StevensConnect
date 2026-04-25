-- Migration 007: Add geocoordinates to listings for map feature
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_listings_lat_lng ON listings (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
