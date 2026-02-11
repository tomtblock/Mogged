-- =============================================================
-- mogged.chat — Full Database Schema
--
-- Designed to run against a Supabase project that already has
-- a `people` table from the seed pipeline.
--
-- Run each numbered section one at a time in the SQL Editor.
-- Each section is fully self-contained — no cross-dependencies.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 1: Custom Enums
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('inactive','active','past_due','canceled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE person_status       AS ENUM ('active','pending_review','disabled');       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vote_context        AS ENUM ('public','game');                            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_status       AS ENUM ('open','reviewing','resolved','rejected');   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE game_role           AS ENUM ('host','member');                            EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 2: Admin-check helper function
--
-- Must exist BEFORE any RLS policies that call it.
-- Uses SECURITY DEFINER to bypass RLS (avoids infinite
-- recursion when profiles checks its own policies).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 3: Profiles table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                           TEXT UNIQUE,
  full_name                       TEXT,
  avatar_url                      TEXT,
  is_admin                        BOOLEAN NOT NULL DEFAULT FALSE,
  default_filters                 JSONB NOT NULL DEFAULT '{}',
  stripe_customer_id              TEXT,
  subscription_status             subscription_status NOT NULL DEFAULT 'inactive',
  subscription_current_period_end TIMESTAMPTZ,
  age_confirmed                   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_admin        ON profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe       ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;

CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- SECTION 4: Alter existing people table + RLS + policies
-- ─────────────────────────────────────────────────────────────

-- Add columns the app needs that the seed schema doesn't have
ALTER TABLE people ADD COLUMN IF NOT EXISTS slug          TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS gender        TEXT DEFAULT 'unspecified';
ALTER TABLE people ADD COLUMN IF NOT EXISTS source_type   TEXT NOT NULL DEFAULT 'seed';
ALTER TABLE people ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES profiles(id);
ALTER TABLE people ADD COLUMN IF NOT EXISTS status        person_status NOT NULL DEFAULT 'active';
ALTER TABLE people ADD COLUMN IF NOT EXISTS visibility    TEXT NOT NULL DEFAULT 'public';
ALTER TABLE people ADD COLUMN IF NOT EXISTS headshot_path TEXT NOT NULL DEFAULT '';
ALTER TABLE people ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE people ADD CONSTRAINT chk_people_visibility CHECK (visibility IN ('public','private'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill slugs for existing seed rows
UPDATE people
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
        || '-'
        || substr(gen_random_uuid()::text, 1, 6)
WHERE slug IS NULL;

-- Make slug NOT NULL now that all rows have one
ALTER TABLE people ALTER COLUMN slug SET NOT NULL;

-- Unique index on slug (safe if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'people'
      AND (indexname = 'people_slug_key' OR indexname = 'idx_people_slug_unique')
  ) THEN
    CREATE UNIQUE INDEX idx_people_slug_unique ON people(slug);
  END IF;
END $$;

-- Backfill headshot_path from headshot_url for seed rows
UPDATE people
SET headshot_path = headshot_url
WHERE headshot_path = '' AND headshot_url IS NOT NULL AND headshot_url != '';

CREATE INDEX IF NOT EXISTS idx_people_status_vis ON people(status, visibility);
CREATE INDEX IF NOT EXISTS idx_people_gender     ON people(gender);

-- RLS + policies
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seed_people_all"      ON people;
DROP POLICY IF EXISTS "people_public_select"  ON people;
DROP POLICY IF EXISTS "people_own_select"     ON people;
DROP POLICY IF EXISTS "people_insert_own"     ON people;
DROP POLICY IF EXISTS "people_update_own"     ON people;
DROP POLICY IF EXISTS "people_admin_all"      ON people;

CREATE POLICY "people_public_select" ON people FOR SELECT
  USING (status = 'active' AND visibility = 'public');

CREATE POLICY "people_own_select" ON people FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "people_insert_own" ON people FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND source_type = 'user_upload' AND visibility = 'private');

CREATE POLICY "people_update_own" ON people FOR UPDATE
  USING (created_by = auth.uid() AND visibility = 'private');

CREATE POLICY "people_admin_all" ON people FOR ALL
  USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- SECTION 5: Votes table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS votes (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voter_user_id     UUID NOT NULL REFERENCES profiles(id),
  context           vote_context NOT NULL DEFAULT 'public',
  game_id           UUID,
  left_person_id    UUID NOT NULL REFERENCES people(id),
  right_person_id   UUID NOT NULL REFERENCES people(id),
  winner_person_id  UUID REFERENCES people(id),
  loser_person_id   UUID REFERENCES people(id),
  skipped           BOOLEAN NOT NULL DEFAULT FALSE,
  filters           JSONB NOT NULL DEFAULT '{}',
  client_session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_votes_context_time ON votes(context, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_winner       ON votes(winner_person_id) WHERE winner_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_loser        ON votes(loser_person_id)  WHERE loser_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_game         ON votes(game_id)          WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_voter        ON votes(voter_user_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_insert"       ON votes;
DROP POLICY IF EXISTS "votes_select_own"   ON votes;
DROP POLICY IF EXISTS "votes_admin_select" ON votes;

CREATE POLICY "votes_insert"       ON votes FOR INSERT WITH CHECK (auth.uid() = voter_user_id);
CREATE POLICY "votes_select_own"   ON votes FOR SELECT USING (auth.uid() = voter_user_id);
CREATE POLICY "votes_admin_select" ON votes FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- SECTION 6: Ratings table + RLS + policies
--
-- Uses NULLS NOT DISTINCT so ON CONFLICT works when
-- game_id IS NULL (Postgres 15+, which Supabase uses).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ratings (
  id           BIGSERIAL PRIMARY KEY,
  context      vote_context NOT NULL DEFAULT 'public',
  game_id      UUID,
  segment_key  TEXT NOT NULL DEFAULT 'all',
  person_id    UUID NOT NULL REFERENCES people(id),
  rating       NUMERIC NOT NULL DEFAULT 1000,
  wins         INT NOT NULL DEFAULT 0,
  losses       INT NOT NULL DEFAULT 0,
  comparisons  INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_unique
  ON ratings(context, game_id, segment_key, person_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_ratings_segment ON ratings(segment_key, rating DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_person  ON ratings(person_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select" ON ratings;
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (TRUE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 7: Pair Stats table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pair_stats (
  id           BIGSERIAL PRIMARY KEY,
  context      vote_context NOT NULL DEFAULT 'public',
  game_id      UUID,
  person_a_id  UUID NOT NULL REFERENCES people(id),
  person_b_id  UUID NOT NULL REFERENCES people(id),
  a_wins       INT NOT NULL DEFAULT 0,
  b_wins       INT NOT NULL DEFAULT 0,
  comparisons  INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_stats_unique
  ON pair_stats(context, game_id, person_a_id, person_b_id) NULLS NOT DISTINCT;

ALTER TABLE pair_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pair_stats_select" ON pair_stats;
CREATE POLICY "pair_stats_select" ON pair_stats FOR SELECT USING (TRUE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 8: Games table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by            UUID NOT NULL REFERENCES profiles(id),
  title                 TEXT NOT NULL,
  description           TEXT,
  join_code             TEXT UNIQUE NOT NULL,
  allow_member_uploads  BOOLEAN NOT NULL DEFAULT TRUE,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK from votes.game_id → games.id
DO $$ BEGIN
  ALTER TABLE votes ADD CONSTRAINT fk_votes_game FOREIGN KEY (game_id) REFERENCES games(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select_member" ON games;
DROP POLICY IF EXISTS "games_insert"        ON games;
DROP POLICY IF EXISTS "games_update_host"   ON games;

CREATE POLICY "games_select_member" ON games FOR SELECT
  USING (EXISTS (SELECT 1 FROM game_members WHERE game_id = games.id AND user_id = auth.uid()));

CREATE POLICY "games_insert" ON games FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "games_update_host" ON games FOR UPDATE
  USING (EXISTS (SELECT 1 FROM game_members WHERE game_id = games.id AND user_id = auth.uid() AND role = 'host'));


-- ─────────────────────────────────────────────────────────────
-- SECTION 9: Game Members table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_members (
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  role       game_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);

ALTER TABLE game_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_members_select" ON game_members;
DROP POLICY IF EXISTS "game_members_insert" ON game_members;

CREATE POLICY "game_members_select" ON game_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM game_members gm WHERE gm.game_id = game_members.game_id AND gm.user_id = auth.uid()));

CREATE POLICY "game_members_insert" ON game_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 10: Game Pool table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_pool (
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  person_id  UUID NOT NULL REFERENCES people(id),
  added_by   UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, person_id)
);

ALTER TABLE game_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_pool_select" ON game_pool;
DROP POLICY IF EXISTS "game_pool_insert" ON game_pool;

CREATE POLICY "game_pool_select" ON game_pool FOR SELECT
  USING (EXISTS (SELECT 1 FROM game_members WHERE game_id = game_pool.game_id AND user_id = auth.uid()));

CREATE POLICY "game_pool_insert" ON game_pool FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM game_members WHERE game_id = game_pool.game_id AND user_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- SECTION 11: Reports table + RLS + policies
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reporter_user_id  UUID NOT NULL REFERENCES profiles(id),
  target_type       TEXT NOT NULL CHECK (target_type IN ('person','vote')),
  target_id         TEXT NOT NULL,
  reason            TEXT NOT NULL,
  details           TEXT,
  status            report_status NOT NULL DEFAULT 'open'
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert"       ON reports;
DROP POLICY IF EXISTS "reports_admin_select" ON reports;

CREATE POLICY "reports_insert"       ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);
CREATE POLICY "reports_admin_select" ON reports FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- SECTION 12: Drop leftover seed-era policies
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "seed_people_all" ON people;
DO $$ BEGIN
  DROP POLICY IF EXISTS "seed_audit_all" ON audit_log;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 13: submit_vote RPC (transactional)
--
-- SECURITY DEFINER — bypasses RLS. The API route already
-- authenticates the caller. All table refs are schema-qualified.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_vote(
  p_voter_id       UUID,
  p_context        vote_context,
  p_game_id        UUID,
  p_left_id        UUID,
  p_right_id       UUID,
  p_winner_id      UUID,
  p_skipped        BOOLEAN DEFAULT FALSE,
  p_filters        JSONB DEFAULT '{}',
  p_session_id     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_loser_id       UUID;
  v_person_a       UUID;
  v_person_b       UUID;
  v_k              NUMERIC := 32;
  v_winner_rating  NUMERIC;
  v_loser_rating   NUMERIC;
  v_expected_w     NUMERIC;
  v_expected_l     NUMERIC;
  v_new_w_rating   NUMERIC;
  v_new_l_rating   NUMERIC;
  v_winner_cat     TEXT;
  v_winner_gender  TEXT;
  v_loser_cat      TEXT;
  v_loser_gender   TEXT;
  v_segments       TEXT[];
  v_seg            TEXT;
BEGIN
  -- 1. Determine loser
  IF p_skipped THEN
    v_loser_id := NULL;
  ELSIF p_winner_id = p_left_id THEN
    v_loser_id := p_right_id;
  ELSE
    v_loser_id := p_left_id;
  END IF;

  -- 2. Insert vote row
  INSERT INTO public.votes
    (voter_user_id, context, game_id, left_person_id, right_person_id,
     winner_person_id, loser_person_id, skipped, filters, client_session_id)
  VALUES
    (p_voter_id, p_context, p_game_id, p_left_id, p_right_id,
     CASE WHEN p_skipped THEN NULL ELSE p_winner_id END,
     v_loser_id, p_skipped, p_filters, p_session_id);

  -- Skip → no rating changes
  IF p_skipped THEN
    RETURN jsonb_build_object('skipped', TRUE);
  END IF;

  -- 3. Look up categories / genders for segment keys
  SELECT category, gender INTO v_winner_cat, v_winner_gender
    FROM public.people WHERE id = p_winner_id;
  SELECT category, gender INTO v_loser_cat, v_loser_gender
    FROM public.people WHERE id = v_loser_id;

  v_segments := ARRAY['all'];

  IF v_winner_cat IS NOT NULL THEN
    v_segments := v_segments || ('category:' || v_winner_cat);
  END IF;
  IF v_loser_cat IS NOT NULL AND v_loser_cat IS DISTINCT FROM v_winner_cat THEN
    v_segments := v_segments || ('category:' || v_loser_cat);
  END IF;
  IF v_winner_gender IS NOT NULL AND v_winner_gender != 'unspecified' THEN
    v_segments := v_segments || ('gender:' || v_winner_gender);
  END IF;
  IF v_loser_gender IS NOT NULL AND v_loser_gender != 'unspecified'
     AND v_loser_gender IS DISTINCT FROM v_winner_gender THEN
    v_segments := v_segments || ('gender:' || v_loser_gender);
  END IF;

  -- 4. Update ratings for each segment
  FOREACH v_seg IN ARRAY v_segments LOOP

    INSERT INTO public.ratings (context, game_id, segment_key, person_id, rating)
    VALUES (p_context, p_game_id, v_seg, p_winner_id, 1000)
    ON CONFLICT (context, game_id, segment_key, person_id) DO NOTHING;

    INSERT INTO public.ratings (context, game_id, segment_key, person_id, rating)
    VALUES (p_context, p_game_id, v_seg, v_loser_id, 1000)
    ON CONFLICT (context, game_id, segment_key, person_id) DO NOTHING;

    SELECT rating INTO v_winner_rating
      FROM public.ratings
     WHERE context     = p_context
       AND game_id IS NOT DISTINCT FROM p_game_id
       AND segment_key = v_seg
       AND person_id   = p_winner_id;

    SELECT rating INTO v_loser_rating
      FROM public.ratings
     WHERE context     = p_context
       AND game_id IS NOT DISTINCT FROM p_game_id
       AND segment_key = v_seg
       AND person_id   = v_loser_id;

    v_expected_w   := 1.0 / (1.0 + power(10, (v_loser_rating  - v_winner_rating) / 400.0));
    v_expected_l   := 1.0 / (1.0 + power(10, (v_winner_rating - v_loser_rating)  / 400.0));
    v_new_w_rating := v_winner_rating + v_k * (1.0 - v_expected_w);
    v_new_l_rating := v_loser_rating  + v_k * (0.0 - v_expected_l);

    UPDATE public.ratings SET
      rating = v_new_w_rating, wins = wins + 1, comparisons = comparisons + 1, updated_at = NOW()
    WHERE context = p_context AND game_id IS NOT DISTINCT FROM p_game_id
      AND segment_key = v_seg AND person_id = p_winner_id;

    UPDATE public.ratings SET
      rating = v_new_l_rating, losses = losses + 1, comparisons = comparisons + 1, updated_at = NOW()
    WHERE context = p_context AND game_id IS NOT DISTINCT FROM p_game_id
      AND segment_key = v_seg AND person_id = v_loser_id;

  END LOOP;

  -- 5. Update pair_stats (enforce a_id < b_id ordering)
  IF p_winner_id < v_loser_id THEN
    v_person_a := p_winner_id;  v_person_b := v_loser_id;
  ELSE
    v_person_a := v_loser_id;   v_person_b := p_winner_id;
  END IF;

  INSERT INTO public.pair_stats
    (context, game_id, person_a_id, person_b_id, a_wins, b_wins, comparisons)
  VALUES (
    p_context, p_game_id, v_person_a, v_person_b,
    CASE WHEN p_winner_id = v_person_a THEN 1 ELSE 0 END,
    CASE WHEN p_winner_id = v_person_b THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (context, game_id, person_a_id, person_b_id) DO UPDATE SET
    a_wins      = pair_stats.a_wins      + CASE WHEN p_winner_id = v_person_a THEN 1 ELSE 0 END,
    b_wins      = pair_stats.b_wins      + CASE WHEN p_winner_id = v_person_b THEN 1 ELSE 0 END,
    comparisons = pair_stats.comparisons + 1,
    updated_at  = NOW();

  RETURN jsonb_build_object(
    'winner_new_rating', v_new_w_rating,
    'loser_new_rating',  v_new_l_rating
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 14: Auto-create profile on signup trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- SECTION 15: Helper function — generate slug
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_slug(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug   TEXT;
  v_suffix TEXT;
BEGIN
  v_slug   := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug   := trim(BOTH '-' FROM v_slug);
  v_suffix := substr(gen_random_uuid()::text, 1, 6);
  RETURN v_slug || '-' || v_suffix;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- SECTION 16: Storage bucket + policies
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('headshots', 'headshots', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "headshots_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "headshots_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "headshots_auth_delete"  ON storage.objects;

CREATE POLICY "headshots_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'headshots');

CREATE POLICY "headshots_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'headshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "headshots_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'headshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────────────
-- DONE. Verify:
--   SELECT count(*) FROM people WHERE slug IS NOT NULL;
--   SELECT count(*) FROM profiles;
--   SELECT count(*) FROM games;
-- ─────────────────────────────────────────────────────────────
