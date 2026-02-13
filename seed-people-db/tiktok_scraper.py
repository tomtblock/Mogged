#!/usr/bin/env python3
"""
TikTok Brainrot Discovery Scraper
──────────────────────────────────
Continuously discovers brainrot-adjacent influencers on TikTok (250k+ followers)
and inserts them into the mogged.chat Supabase database.

Runs indefinitely in the background.

Usage:
  python3 tiktok_scraper.py
"""

import asyncio, os, re, sys, json, time, uuid, random, requests
from datetime import datetime, timezone

# ─── Env ─────────────────────────────────────────────────
def _env(path):
    if not os.path.exists(path): return {}
    d={}
    with open(path) as f:
        for l in f:
            l=l.strip()
            if l and not l.startswith("#") and "=" in l:
                k,v=l.split("=",1); d[k.strip()]=v.strip()
    return d

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_el = _env(os.path.join(_root, ".env.local"))
_es = _env(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
SUPABASE_URL = _el.get("NEXT_PUBLIC_SUPABASE_URL") or _es.get("SUPABASE_URL")
SUPABASE_KEY = _el.get("SUPABASE_SERVICE_ROLE_KEY") or _es.get("SUPABASE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─── Config ──────────────────────────────────────────────
MIN_FOLLOWERS = 250_000
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_state.json")
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper.log")

SEED_HANDLES = [
    "adinross", "clavicular", "hstikkytokky",
    "ishowspeed", "jakepaul", "ksi", "n3on",
    "kaicenat", "edmatthewsofficial", "stableronaldo",
    "caseoh_", "jynxzi", "faboriquen3on", "agent00",
]

DISCOVERY_HASHTAGS = [
    "brainrot", "mogger", "looksmaxing", "mog", "mogged",
    "irlstreaming", "kickstreamer", "brainrotcontent",
    "influencerboxing", "misfitsboxing", "npc", "npcstreamer",
    "tiktokboxing", "sidemen", "brainrotking",
]

DISCOVERY_SEARCHES = [
    "brainrot influencer", "kick streamer", "mogger tiktok",
    "looksmaxing", "irl stream", "influencer boxing",
    "npc streamer famous", "brainrot content creator",
]

# Bio keywords that signal brainrot-adjacent content
BRAINROT_KEYWORDS = [
    "stream", "kick", "twitch", "boxing", "mog", "looksmax",
    "gym", "fitness", "irl", "npc", "gaming", "gamer",
    "content creator", "youtube", "podcast", "comedian",
    "wrestler", "fighter", "prankster", "influencer",
    "entrepreneur", "brand deals", "sigma",
]


# ─── Logging ─────────────────────────────────────────────
def log(msg):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ─── State management ────────────────────────────────────
def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "visited": [],
        "queue": list(SEED_HANDLES),
        "inserted": [],
        "skipped": [],
        "total_discovered": 0,
        "total_inserted": 0,
        "runs": 0,
    }

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# ─── Supabase ────────────────────────────────────────────
def already_in_db(handle):
    """Check if handle is already in the database."""
    try:
        url = f"{SUPABASE_URL}/rest/v1/people?platform_handles->>tiktok=cs.{json.dumps(handle)}&select=name&limit=1"
        # Simpler approach: search by name pattern
        return False  # Let slug uniqueness handle dedup
    except:
        return False

def check_name_exists(name):
    """Check if a person with similar name exists."""
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/people?name=ilike.{requests.utils.quote(name)}&select=id&limit=1",
            headers=HEADERS, timeout=10
        )
        return r.ok and len(r.json()) > 0
    except:
        return False

def insert_person(data):
    """Insert a person into Supabase."""
    slug = re.sub(r'-+', '-', re.sub(r'[\s_]+', '-', re.sub(r'[^\w\s-]', '', data["name"].lower().strip()))).strip('-')
    slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    record = {
        "slug": slug,
        "name": data["name"],
        "profession": "tiktoker",
        "category": "tiktoker",
        "gender": data.get("gender", "unspecified"),
        "source_type": "tiktok_scraper",
        "status": "active",
        "visibility": "public",
        "headshot_path": data.get("avatar", "") or "",
        "headshot_url": data.get("avatar", "") or "",
        "headshot_source": "tiktok_profile",
        "headshot_license": "fair_use",
        "headshot_attribution": f"TikTok @{data.get('handle', '')}",
        "platform_handles": {
            "tiktok": data.get("followers", 0),
            "_handle": data.get("handle", ""),
            "_total_followers": data.get("followers", 0),
            "_bio": data.get("bio", ""),
            "_discovered_from": data.get("discovered_from", "seed"),
            "_discovered_at": datetime.now(timezone.utc).isoformat(),
        },
    }

    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/people",
            headers=HEADERS, json=record, timeout=15
        )
        if r.status_code in (200, 201):
            log(f"  DB ++ {data['name']} (@{data['handle']}) — {data['followers']:,} followers")
            return True
        else:
            log(f"  DB ERR {r.status_code}: {r.text[:100]}")
            return False
    except Exception as e:
        log(f"  DB EXC: {e}")
        return False


# ─── TikTok extraction ───────────────────────────────────
def parse_followers(text):
    """Parse '1.2M' or '500K' into an integer."""
    if not text:
        return 0
    text = text.strip().upper().replace(",", "")
    try:
        if "M" in text:
            return int(float(text.replace("M", "")) * 1_000_000)
        elif "K" in text:
            return int(float(text.replace("K", "")) * 1_000)
        else:
            return int(text)
    except:
        return 0


async def extract_profile_data(page):
    """Extract profile data from a TikTok profile page."""
    # Strategy 1: Try __UNIVERSAL_DATA_FOR_REHYDRATION__
    try:
        data = await page.evaluate("""() => {
            const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
            if (el) return JSON.parse(el.textContent);
            return null;
        }""")
        if data:
            # Navigate the data structure
            default_scope = data.get("__DEFAULT_SCOPE__", {})
            user_detail = default_scope.get("webapp.user-detail", {})
            user_info = user_detail.get("userInfo", {})
            user = user_info.get("user", {})
            stats = user_info.get("stats", {})

            if user.get("uniqueId"):
                return {
                    "handle": user.get("uniqueId", ""),
                    "name": user.get("nickname", user.get("uniqueId", "")),
                    "followers": stats.get("followerCount", 0),
                    "following": stats.get("followingCount", 0),
                    "likes": stats.get("heartCount", 0),
                    "videos": stats.get("videoCount", 0),
                    "bio": user.get("signature", ""),
                    "verified": user.get("verified", False),
                    "avatar": user.get("avatarLarger", "") or user.get("avatarMedium", ""),
                }
    except Exception as e:
        log(f"    Strategy 1 failed: {e}")

    # Strategy 2: Try SIGI_STATE
    try:
        data = await page.evaluate("""() => {
            const el = document.getElementById('SIGI_STATE');
            if (el) return JSON.parse(el.textContent);
            return null;
        }""")
        if data:
            user_module = data.get("UserModule", {})
            users = user_module.get("users", {})
            stats_module = user_module.get("stats", {})
            if users:
                uid = list(users.keys())[0]
                user = users[uid]
                stat = stats_module.get(uid, {})
                return {
                    "handle": user.get("uniqueId", uid),
                    "name": user.get("nickname", uid),
                    "followers": stat.get("followerCount", 0),
                    "following": stat.get("followingCount", 0),
                    "likes": stat.get("heartCount", 0),
                    "videos": stat.get("videoCount", 0),
                    "bio": user.get("signature", ""),
                    "verified": user.get("verified", False),
                    "avatar": user.get("avatarLarger", ""),
                }
    except Exception as e:
        log(f"    Strategy 2 failed: {e}")

    # Strategy 3: DOM scraping fallback
    try:
        info = await page.evaluate("""() => {
            const result = {};
            // Try to find follower count from data attributes or text
            const h2s = document.querySelectorAll('h2[data-e2e="user-subtitle"]');
            if (h2s.length) result.name_el = h2s[0].textContent;

            const h1s = document.querySelectorAll('h1[data-e2e="user-title"]');
            if (h1s.length) result.handle = h1s[0].textContent;

            // Follower count
            const followerEl = document.querySelector('[data-e2e="followers-count"]');
            if (followerEl) result.followers_text = followerEl.textContent;

            const followingEl = document.querySelector('[data-e2e="following-count"]');
            if (followingEl) result.following_text = followingEl.textContent;

            const likesEl = document.querySelector('[data-e2e="likes-count"]');
            if (likesEl) result.likes_text = likesEl.textContent;

            // Bio
            const bioEl = document.querySelector('[data-e2e="user-bio"]');
            if (bioEl) result.bio = bioEl.textContent;

            // Name
            const nameEl = document.querySelector('[data-e2e="user-subtitle"]');
            if (nameEl) result.name = nameEl.textContent;

            // Avatar
            const avatarEl = document.querySelector('[data-e2e="user-avatar"] img');
            if (avatarEl) result.avatar = avatarEl.src;

            return result;
        }""")

        if info.get("handle") or info.get("followers_text"):
            return {
                "handle": info.get("handle", "").lstrip("@"),
                "name": info.get("name", info.get("handle", "")),
                "followers": parse_followers(info.get("followers_text", "0")),
                "following": parse_followers(info.get("following_text", "0")),
                "likes": parse_followers(info.get("likes_text", "0")),
                "bio": info.get("bio", ""),
                "verified": False,
                "avatar": info.get("avatar", ""),
            }
    except Exception as e:
        log(f"    Strategy 3 failed: {e}")

    return None


async def discover_suggested(page):
    """Find suggested/related handles from the current page."""
    handles = []
    try:
        # Look for suggested accounts in the sidebar or page
        found = await page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
            const handles = new Set();
            for (const a of links) {
                const href = a.getAttribute('href');
                const match = href.match(/\/@([a-zA-Z0-9_.]+)/);
                if (match && match[1]) handles.add(match[1].toLowerCase());
            }
            return Array.from(handles);
        }""")
        if found:
            handles.extend(found)
    except:
        pass
    return handles


async def discover_from_hashtag(page, tag):
    """Browse a hashtag page and extract creator handles."""
    handles = []
    url = f"https://www.tiktok.com/tag/{tag}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000 + random.randint(0, 2000))

        found = await page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
            const handles = new Set();
            for (const a of links) {
                const href = a.getAttribute('href');
                const match = href.match(/\/@([a-zA-Z0-9_.]+)/);
                if (match && match[1]) handles.add(match[1].toLowerCase());
            }
            return Array.from(handles);
        }""")
        if found:
            handles.extend(found)

        # Scroll down to load more
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(1500)
            more = await page.evaluate("""() => {
                const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
                const handles = new Set();
                for (const a of links) {
                    const href = a.getAttribute('href');
                    const match = href.match(/\/@([a-zA-Z0-9_.]+)/);
                    if (match && match[1]) handles.add(match[1].toLowerCase());
                }
                return Array.from(handles);
            }""")
            if more:
                handles.extend(more)

    except Exception as e:
        log(f"  Hashtag #{tag} error: {e}")

    return list(set(handles))


async def discover_from_search(page, query):
    """Search TikTok for a query and extract creator handles."""
    handles = []
    url = f"https://www.tiktok.com/search/user?q={requests.utils.quote(query)}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000 + random.randint(0, 2000))

        found = await page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
            const handles = new Set();
            for (const a of links) {
                const href = a.getAttribute('href');
                const match = href.match(/\/@([a-zA-Z0-9_.]+)/);
                if (match && match[1]) handles.add(match[1].toLowerCase());
            }
            return Array.from(handles);
        }""")
        if found:
            handles.extend(found)
    except Exception as e:
        log(f"  Search '{query}' error: {e}")

    return list(set(handles))


# ─── Main loop ───────────────────────────────────────────
async def main():
    from playwright.async_api import async_playwright

    log("=" * 60)
    log("  TikTok Brainrot Discovery Scraper")
    log("=" * 60)

    state = load_state()
    visited = set(state["visited"])
    queue = list(state["queue"])
    if not queue:
        queue = list(SEED_HANDLES)

    log(f"  State: {len(visited)} visited, {len(queue)} queued, {state['total_inserted']} in DB")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Stealth: remove webdriver flag
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
            window.chrome = { runtime: {} };
        """)

        page = await context.new_page()

        cycle = 0
        while True:
            cycle += 1
            state["runs"] = cycle
            log(f"\n{'─'*60}")
            log(f"  Cycle {cycle} | Queue: {len(queue)} | Visited: {len(visited)} | Inserted: {state['total_inserted']}")
            log(f"{'─'*60}")

            # ── Phase 1: Process profiles from queue ──
            profiles_this_cycle = 0
            max_per_cycle = 10

            while queue and profiles_this_cycle < max_per_cycle:
                handle = queue.pop(0)
                handle = handle.lower().strip().lstrip("@")

                if handle in visited or len(handle) < 2:
                    continue

                visited.add(handle)
                profiles_this_cycle += 1
                log(f"\n  [{profiles_this_cycle}/{max_per_cycle}] Visiting @{handle}...")

                try:
                    url = f"https://www.tiktok.com/@{handle}"
                    await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    await page.wait_for_timeout(2000 + random.randint(500, 2000))

                    # Check for captcha/block
                    page_text = await page.text_content("body") or ""
                    if "captcha" in page_text.lower() or "verify" in page_text.lower()[:500]:
                        log(f"    CAPTCHA detected — pausing 60s")
                        await asyncio.sleep(60)
                        continue

                    data = await extract_profile_data(page)

                    if not data or not data.get("handle"):
                        log(f"    Could not extract data for @{handle}")
                        continue

                    followers = data.get("followers", 0)
                    log(f"    {data['name']} — {followers:,} followers — bio: {data.get('bio', '')[:60]}")

                    # Discover suggested handles from this page
                    suggested = await discover_suggested(page)
                    new_suggestions = [h for h in suggested if h not in visited and h not in queue]
                    if new_suggestions:
                        queue.extend(new_suggestions[:20])  # Cap to avoid explosion
                        log(f"    Found {len(new_suggestions)} new handles from suggestions")
                        state["total_discovered"] += len(new_suggestions)

                    # Check if qualifies
                    if followers < MIN_FOLLOWERS:
                        log(f"    SKIP: {followers:,} < {MIN_FOLLOWERS:,} minimum")
                        state["skipped"].append(handle)
                        continue

                    # Check if already in DB
                    if check_name_exists(data["name"]):
                        log(f"    SKIP: already in database")
                        continue

                    # Insert
                    data["discovered_from"] = "tiktok_scraper"
                    if insert_person(data):
                        state["total_inserted"] += 1
                        state["inserted"].append(handle)

                except Exception as e:
                    log(f"    ERROR: {e}")

                # Rate limit between profiles
                delay = random.uniform(3, 8)
                await asyncio.sleep(delay)

            # ── Phase 2: Discover new handles via hashtags ──
            if len(queue) < 20:
                tag = random.choice(DISCOVERY_HASHTAGS)
                log(f"\n  Exploring hashtag #{tag}...")
                new_handles = await discover_from_hashtag(page, tag)
                new_handles = [h for h in new_handles if h not in visited and h not in queue]
                queue.extend(new_handles[:30])
                log(f"    Found {len(new_handles)} new handles from #{tag}")
                state["total_discovered"] += len(new_handles)
                await asyncio.sleep(random.uniform(3, 6))

            # ── Phase 3: Discover via search ──
            if len(queue) < 10:
                query = random.choice(DISCOVERY_SEARCHES)
                log(f"\n  Searching: '{query}'...")
                new_handles = await discover_from_search(page, query)
                new_handles = [h for h in new_handles if h not in visited and h not in queue]
                queue.extend(new_handles[:30])
                log(f"    Found {len(new_handles)} new handles from search")
                state["total_discovered"] += len(new_handles)
                await asyncio.sleep(random.uniform(3, 6))

            # ── Save state ──
            state["visited"] = list(visited)[-500:]  # Keep last 500 to cap file size
            state["queue"] = queue[:200]  # Cap queue
            save_state(state)
            log(f"\n  State saved. Queue: {len(queue)}, Visited: {len(visited)}, DB inserts: {state['total_inserted']}")

            # ── Pause between cycles ──
            pause = random.uniform(15, 30)
            log(f"  Pausing {pause:.0f}s before next cycle...")
            await asyncio.sleep(pause)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log("\nScraper stopped by user.")
    except Exception as e:
        log(f"\nFATAL: {e}")
        sys.exit(1)
