-- ============================================================
-- Migration 001: Initial schema
-- StevensConnect — University Marketplace
--
-- Run order matters. Tables are created dependency-first.
-- This migration is idempotent (safe to re-run in dev).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('housing', 'marketplace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE housing_subtype AS ENUM ('apartment', 'roommate', 'sublet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE marketplace_category AS ENUM (
    'textbooks',
    'electronics',
    'furniture',
    'clothing',
    'bikes',
    'kitchen',
    'sports',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'scam', 'wrong_category', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,  -- must end in @stevens.edu (enforced in app)
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  grad_year     SMALLINT,                       -- e.g. 2026
  major         VARCHAR(100),
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================
-- EMAIL VERIFICATIONS
-- One token per signup flow. Token is single-use and expires.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,                       -- NULL = not yet used
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token   ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);

-- ============================================================
-- REFRESH TOKENS
-- Raw token is never stored — only its SHA-256 hash.
-- Token is rotated on every /auth/refresh call.
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,                      -- NULL = still valid
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ============================================================
-- LISTINGS
-- Unified table for both housing and marketplace listings.
-- listing_type determines which subset of fields applies.
-- Housing-specific and marketplace-specific columns are NULL
-- when they don't apply to the listing_type.
-- ============================================================

CREATE TABLE IF NOT EXISTS listings (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_type listing_type   NOT NULL,
  title        VARCHAR(200)   NOT NULL,
  description  TEXT           NOT NULL,
  price        NUMERIC(10,2),                   -- NULL = free or contact for price
  is_free      BOOLEAN        NOT NULL DEFAULT FALSE,
  status       listing_status NOT NULL DEFAULT 'active',

  -- ---- Housing-specific fields (NULL when listing_type = 'marketplace') ----
  housing_subtype    housing_subtype,
  address            VARCHAR(300),
  bedrooms           SMALLINT,
  bathrooms          NUMERIC(3,1),
  available_from     DATE,
  available_until    DATE,
  is_furnished       BOOLEAN,
  pets_allowed       BOOLEAN,
  utilities_included BOOLEAN,

  -- ---- Marketplace-specific fields (NULL when listing_type = 'housing') ----
  marketplace_category marketplace_category,
  -- 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  condition            VARCHAR(10) CHECK (condition IN ('new','like_new','good','fair','poor')),

  -- ---- Shared fields ----
  image_urls    TEXT[]      NOT NULL DEFAULT '{}',
  location_text VARCHAR(200),                   -- e.g. "Hoboken, NJ" — not a full address for privacy
  views_count   INTEGER     NOT NULL DEFAULT 0,

  -- Full-text search vector. Auto-maintained by PostgreSQL. GIN-indexed.
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_type_status   ON listings(listing_type, status);
CREATE INDEX IF NOT EXISTS idx_listings_user_id       ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at    ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_search        ON listings USING GIN(search_vector);
-- Partial indexes — only on rows where the column is relevant
CREATE INDEX IF NOT EXISTS idx_listings_housing_sub   ON listings(housing_subtype)         WHERE housing_subtype IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_mkt_category  ON listings(marketplace_category)    WHERE marketplace_category IS NOT NULL;

-- ============================================================
-- LISTING SAVES (bookmarks / favorites)
-- ============================================================

CREATE TABLE IF NOT EXISTS listing_saves (
  user_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  listing_id UUID        NOT NULL REFERENCES listings(id)  ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ============================================================
-- CONVERSATIONS
-- 1-on-1 conversations only (MVP).
-- listing_id is optional context — which listing prompted the chat.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID        REFERENCES listings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- Exactly 2 participants per conversation (enforced in app logic).
-- last_read_at is used to compute unread message counts.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,                  -- NULL = never read anything
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);

-- ============================================================
-- MESSAGES
-- Soft-delete: is_deleted=true renders the message as
-- "This message was deleted" in the UI but preserves DB integrity.
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index: fetching messages in a conversation ordered by time is the hot path
CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- ============================================================
-- REPORTS
-- Moderation table. Admins resolve reports manually for MVP.
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID          NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  listing_id  UUID          REFERENCES listings(id)           ON DELETE CASCADE,
  reason      report_reason NOT NULL,
  details     TEXT,
  resolved_at TIMESTAMPTZ,                      -- NULL = unresolved
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: auto-update updated_at on mutations
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at    ON users;
DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
