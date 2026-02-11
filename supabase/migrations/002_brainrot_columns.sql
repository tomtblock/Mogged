-- =============================================================
-- mogged.chat — Social Followers & Discovery Schema Extension
-- Adds social handles, follower counts, brainrot scoring,
-- and an import RPC function.
--
-- Run this in Supabase SQL Editor BEFORE running the import script.
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. Social handle columns
-- ─────────────────────────────────────────────
ALTER TABLE people ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS youtube_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS twitch_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS kick_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS x_handle TEXT;

-- ─────────────────────────────────────────────
-- 2. Follower / subscriber counts
-- ─────────────────────────────────────────────
ALTER TABLE people ADD COLUMN IF NOT EXISTS instagram_followers BIGINT DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS tiktok_followers BIGINT DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS youtube_subscribers BIGINT DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS twitch_followers BIGINT DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS kick_followers BIGINT DEFAULT 0;
ALTER TABLE people ADD COLUMN IF NOT EXISTS total_followers BIGINT DEFAULT 0;

-- ─────────────────────────────────────────────
-- 3. Discovery & scoring columns
-- ─────────────────────────────────────────────
ALTER TABLE people ADD COLUMN IF NOT EXISTS brainrot_score INTEGER
  CHECK (brainrot_score IS NULL OR brainrot_score BETWEEN 1 AND 10);
ALTER TABLE people ADD COLUMN IF NOT EXISTS content_tags TEXT[] DEFAULT '{}';
ALTER TABLE people ADD COLUMN IF NOT EXISTS relationships JSONB DEFAULT '[]';
ALTER TABLE people ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS bio_summary TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS followers_updated_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_people_total_followers
  ON people(total_followers DESC) WHERE total_followers > 0;

CREATE INDEX IF NOT EXISTS idx_people_brainrot_score
  ON people(brainrot_score DESC) WHERE brainrot_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_instagram_handle
  ON people(instagram_handle) WHERE instagram_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_tiktok_handle
  ON people(tiktok_handle) WHERE tiktok_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_twitch_handle
  ON people(twitch_handle) WHERE twitch_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_kick_handle
  ON people(kick_handle) WHERE kick_handle IS NOT NULL;

-- ─────────────────────────────────────────────
-- 5. import_person RPC  (SECURITY DEFINER → bypasses RLS)
--    Call via POST /rest/v1/rpc/import_person
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION import_person(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id     UUID;
  v_slug   TEXT;
  v_action TEXT;
  v_total  BIGINT;
BEGIN
  v_slug := p_data->>'slug';

  -- Calculate total followers from all platforms
  v_total := COALESCE((p_data->>'tiktok_followers')::bigint, 0)
           + COALESCE((p_data->>'twitch_followers')::bigint, 0)
           + COALESCE((p_data->>'kick_followers')::bigint, 0)
           + COALESCE((p_data->>'instagram_followers')::bigint, 0)
           + COALESCE((p_data->>'youtube_subscribers')::bigint, 0);

  -- ── Try to find existing person by slug ──
  SELECT id INTO v_id FROM people WHERE slug = v_slug LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- ════ UPDATE ════
    UPDATE people SET
      name               = COALESCE(p_data->>'name', name),
      profession         = COALESCE(p_data->>'profession', profession),
      category           = COALESCE(p_data->>'category', category),
      gender             = COALESCE(p_data->>'gender', gender),
      instagram_handle   = COALESCE(p_data->>'instagram_handle', instagram_handle),
      tiktok_handle      = COALESCE(p_data->>'tiktok_handle', tiktok_handle),
      youtube_handle     = COALESCE(p_data->>'youtube_handle', youtube_handle),
      twitch_handle      = COALESCE(p_data->>'twitch_handle', twitch_handle),
      kick_handle        = COALESCE(p_data->>'kick_handle', kick_handle),
      x_handle           = COALESCE(p_data->>'x_handle', x_handle),
      tiktok_followers   = GREATEST(COALESCE((p_data->>'tiktok_followers')::bigint, 0), tiktok_followers),
      twitch_followers   = GREATEST(COALESCE((p_data->>'twitch_followers')::bigint, 0), twitch_followers),
      kick_followers     = GREATEST(COALESCE((p_data->>'kick_followers')::bigint, 0), kick_followers),
      instagram_followers= GREATEST(COALESCE((p_data->>'instagram_followers')::bigint, 0), instagram_followers),
      youtube_subscribers= GREATEST(COALESCE((p_data->>'youtube_subscribers')::bigint, 0), youtube_subscribers),
      total_followers    = GREATEST(v_total, total_followers),
      brainrot_score     = COALESCE((p_data->>'brainrot_score')::int, brainrot_score),
      content_tags       = CASE
        WHEN p_data ? 'content_tags' AND jsonb_array_length(p_data->'content_tags') > 0
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'content_tags'))
        ELSE content_tags END,
      discovery_source   = COALESCE(p_data->>'discovery_source', discovery_source),
      bio_summary        = COALESCE(p_data->>'bio_summary', bio_summary),
      headshot_url       = COALESCE(p_data->>'headshot_url', headshot_url),
      followers_updated_at = NOW(),
      updated_at         = NOW()
    WHERE id = v_id;

    v_action := 'updated';

  ELSE
    -- ════ INSERT ════
    INSERT INTO people (
      slug, name, profession, category, gender,
      source_type, status, visibility,
      headshot_path, headshot_url, headshot_attribution, headshot_license,
      instagram_handle, tiktok_handle, youtube_handle, twitch_handle, kick_handle, x_handle,
      tiktok_followers, twitch_followers, kick_followers,
      instagram_followers, youtube_subscribers, total_followers,
      brainrot_score, content_tags, discovery_source, bio_summary,
      followers_updated_at
    ) VALUES (
      v_slug,
      p_data->>'name',
      COALESCE(p_data->>'profession', 'influencer'),
      COALESCE(p_data->>'category', 'internet_personality'),
      COALESCE(p_data->>'gender', 'unspecified'),
      COALESCE(p_data->>'source_type', 'csv_import'),
      'active',
      'public',
      COALESCE(p_data->>'headshot_path', ''),
      p_data->>'headshot_url',
      p_data->>'headshot_attribution',
      p_data->>'headshot_license',
      p_data->>'instagram_handle',
      p_data->>'tiktok_handle',
      p_data->>'youtube_handle',
      p_data->>'twitch_handle',
      p_data->>'kick_handle',
      p_data->>'x_handle',
      COALESCE((p_data->>'tiktok_followers')::bigint, 0),
      COALESCE((p_data->>'twitch_followers')::bigint, 0),
      COALESCE((p_data->>'kick_followers')::bigint, 0),
      COALESCE((p_data->>'instagram_followers')::bigint, 0),
      COALESCE((p_data->>'youtube_subscribers')::bigint, 0),
      v_total,
      (p_data->>'brainrot_score')::int,
      CASE
        WHEN p_data ? 'content_tags' AND jsonb_array_length(p_data->'content_tags') > 0
        THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'content_tags'))
        ELSE '{}' END,
      p_data->>'discovery_source',
      p_data->>'bio_summary',
      NOW()
    )
    RETURNING id INTO v_id;

    v_action := 'inserted';
  END IF;

  RETURN jsonb_build_object(
    'id',     v_id,
    'action', v_action,
    'slug',   v_slug,
    'name',   p_data->>'name',
    'total',  v_total
  );
END;
$$;
