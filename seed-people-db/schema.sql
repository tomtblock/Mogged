-- =============================================================
-- Seed People Database Schema v1
-- Run this in your Supabase SQL Editor BEFORE running the pipeline.
-- =============================================================

-- People table
CREATE TABLE IF NOT EXISTS people (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT NOT NULL,
    profession      TEXT NOT NULL,
    category        TEXT NOT NULL,
    aliases         TEXT[] DEFAULT '{}',
    platform_handles JSONB DEFAULT '{}',
    headshot_url    TEXT NOT NULL,
    headshot_source TEXT NOT NULL,
    headshot_license TEXT NOT NULL,
    headshot_attribution TEXT NOT NULL,
    source_urls     TEXT[] DEFAULT '{}',
    wikidata_qid    TEXT UNIQUE,
    birth_year      INTEGER,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_qid      TEXT,
    person_name     TEXT,
    action          TEXT NOT NULL,
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_category ON people(category);
CREATE INDEX IF NOT EXISTS idx_people_qid ON people(wikidata_qid);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_profession ON people(profession);
CREATE INDEX IF NOT EXISTS idx_audit_person_qid ON audit_log(person_qid);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- Row Level Security — permissive for seeding.
-- Tighten these policies before exposing to end users.
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seed_people_all" ON people
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "seed_audit_all" ON audit_log
    FOR ALL USING (true) WITH CHECK (true);
