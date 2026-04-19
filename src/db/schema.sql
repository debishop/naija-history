-- Nigeria History Pipeline — first-slice schema
-- Run via: npm run db:migrate

BEGIN;

CREATE TABLE IF NOT EXISTS story_candidates (
  id            SERIAL PRIMARY KEY,
  source_url    TEXT        NOT NULL,
  source_domain TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  summary       TEXT,
  raw_content   TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'validated', 'rejected')),
  reject_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_posts (
  id                   SERIAL PRIMARY KEY,
  story_candidate_id   INTEGER     NOT NULL REFERENCES story_candidates(id),
  body                 TEXT        NOT NULL,
  source_citation      TEXT        NOT NULL,
  hashtags             TEXT[]      NOT NULL DEFAULT '{}',
  status               TEXT        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
  reject_reason        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_records (
  id               SERIAL PRIMARY KEY,
  draft_post_id    INTEGER     NOT NULL REFERENCES draft_posts(id),
  facebook_post_id TEXT        NOT NULL UNIQUE,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
