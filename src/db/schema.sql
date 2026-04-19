-- Nigeria History Pipeline — first-slice schema
-- Run via: npm run db:migrate

BEGIN;

CREATE TABLE IF NOT EXISTS story_candidates (
  id            SERIAL PRIMARY KEY,
  source_url    TEXT        NOT NULL,
  source_domain TEXT        NOT NULL,
  source_name   TEXT        NOT NULL DEFAULT '',
  title         TEXT        NOT NULL,
  summary       TEXT,
  raw_content   TEXT,
  content_hash  TEXT        UNIQUE,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'validated', 'rejected')),
  reject_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to existing tables if running against an already-migrated DB
DO $$ BEGIN
  ALTER TABLE story_candidates ADD COLUMN IF NOT EXISTS source_name TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE story_candidates ADD COLUMN IF NOT EXISTS content_hash TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE story_candidates ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_story_candidates_content_hash ON story_candidates(content_hash);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS draft_posts (
  id                   SERIAL PRIMARY KEY,
  story_candidate_id   INTEGER     NOT NULL REFERENCES story_candidates(id),
  body                 TEXT        NOT NULL,
  source_citation      TEXT        NOT NULL,
  source_url           TEXT        NOT NULL DEFAULT '',
  source_name          TEXT        NOT NULL DEFAULT '',
  hashtags             TEXT[]      NOT NULL DEFAULT '{}',
  status               TEXT        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'approved', 'rejected', 'published', 'pending_approval')),
  reject_reason        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to draft_posts if running against an already-migrated DB
DO $$ BEGIN
  ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE draft_posts ADD COLUMN IF NOT EXISTS source_name TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS post_records (
  id               SERIAL PRIMARY KEY,
  draft_post_id    INTEGER     NOT NULL REFERENCES draft_posts(id),
  facebook_post_id TEXT        UNIQUE,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT        NOT NULL DEFAULT 'published'
                   CHECK (status IN ('published', 'failed', 'retrying')),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to post_records if running against an already-migrated DB
DO $$ BEGIN
  ALTER TABLE post_records ALTER COLUMN facebook_post_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE post_records ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'failed', 'retrying'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE post_records ADD COLUMN IF NOT EXISTS error_message TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- v2: autonomous pipeline columns
DO $$ BEGIN
  ALTER TABLE post_records ADD COLUMN IF NOT EXISTS scheduled_snapshot_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE post_records ADD COLUMN IF NOT EXISTS snapshot_taken BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- v2: allow pending_approval status on draft_posts (drop and re-add constraint)
DO $$ BEGIN
  ALTER TABLE draft_posts DROP CONSTRAINT IF EXISTS draft_posts_status_check;
  ALTER TABLE draft_posts ADD CONSTRAINT draft_posts_status_check
    CHECK (status IN ('draft', 'approved', 'rejected', 'published', 'pending_approval'));
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS engagement_records (
  id               SERIAL PRIMARY KEY,
  post_record_id   INTEGER     NOT NULL REFERENCES post_records(id),
  facebook_post_id TEXT        NOT NULL,
  likes            INTEGER     NOT NULL DEFAULT 0,
  shares           INTEGER     NOT NULL DEFAULT 0,
  comments         INTEGER     NOT NULL DEFAULT 0,
  reach            INTEGER     NOT NULL DEFAULT 0,
  snapshot_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_story_candidates_status ON story_candidates(status);
CREATE INDEX IF NOT EXISTS idx_draft_posts_status      ON draft_posts(status);
CREATE INDEX IF NOT EXISTS idx_post_records_post_id    ON post_records(facebook_post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_post_id      ON engagement_records(facebook_post_id);

COMMIT;
