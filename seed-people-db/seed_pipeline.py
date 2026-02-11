#!/usr/bin/env python3
"""
seed_pipeline.py — Seed People DB v1: Gen Z Public Figures

Discovers adult (18+) public figures recognizable to ages 12-30 from
Wikidata, resolves open-licensed headshots from Wikimedia Commons,
applies safety filtering, deduplicates, and uploads to Supabase.

Usage:
    1. Run schema.sql in your Supabase SQL Editor first.
    2. pip install -r requirements.txt
    3. python seed_pipeline.py
"""

import csv
import hashlib
import json
import logging
import os
import re
import sys
import time
import urllib.parse
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv
from tqdm import tqdm

# ── Configuration ────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"

USER_AGENT = "SeedPeopleDB/1.0 (mogged.chat seed pipeline; contact@mogged.chat)"

BASE_DIR = Path(__file__).parent
INTERMEDIATE_DIR = BASE_DIR / "_intermediate"
OUTPUT_DIR = BASE_DIR / "output"
INTERMEDIATE_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Rate limiting (seconds between API calls)
SPARQL_DELAY = 2.0
COMMONS_API_DELAY = 0.3
SUPABASE_BATCH_SIZE = 50

# Current date for age checks
CURRENT_YEAR = datetime.now(timezone.utc).year
MIN_BIRTH_YEAR_FOR_ADULT = CURRENT_YEAR - 18  # born this year or earlier = 18+

SUSPECTED_MINOR_SIGNALS = ["16", "17", "high school", "teen"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(BASE_DIR / "pipeline.log"),
    ],
)
log = logging.getLogger("seed_pipeline")


# ── Data Model ───────────────────────────────────────────────────────


@dataclass
class Candidate:
    qid: str
    name: str
    description: str = ""
    profession: str = ""
    category: str = ""
    aliases: list = field(default_factory=list)
    birth_year: Optional[int] = None
    gender: str = ""
    platform_handles: dict = field(default_factory=dict)
    headshot_url: str = ""
    headshot_filename: str = ""
    headshot_source: str = ""
    headshot_license: str = ""
    headshot_attribution: str = ""
    headshot_width: int = 0
    headshot_height: int = 0
    source_urls: list = field(default_factory=list)
    last_verified_at: str = ""


@dataclass
class AuditEntry:
    person_qid: str
    person_name: str
    action: str
    details: dict = field(default_factory=dict)
    created_at: str = ""


# ── Category / Occupation Mapping ────────────────────────────────────

CATEGORY_CONFIG = {
    "streamer": {
        "occupations": [
            "Q105756500",  # live streamer
            "Q16947657",   # esports player (often streamers)
        ],
        "limit": 350,
        "min_birth_year": 1980,
    },
    "tiktoker": {
        "occupations": [
            "Q94791573",   # TikToker
        ],
        "extra_queries": ["tiktok_handle_holders"],
        "limit": 500,
        "min_birth_year": 1985,
    },
    "athlete": {
        "occupations": [
            "Q3665646",    # basketball player
            "Q937857",     # American football player
            "Q11303721",   # association football player
            "Q10843402",   # baseball player
            "Q10833314",   # tennis player
            "Q13381376",   # boxer
            "Q19204627",   # mixed martial arts fighter
            "Q11338576",   # swimmer
            "Q18515558",   # track and field athlete
        ],
        "limit": 450,
        "min_birth_year": 1980,
    },
    "actor": {
        "occupations": [
            "Q33999",      # actor
            "Q10800557",   # film actor
            "Q2405480",    # voice actor
        ],
        "gender_filter": "Q6581072",  # male
        "limit": 300,
        "min_birth_year": 1975,
    },
    "actress": {
        "occupations": [
            "Q33999",      # actor
            "Q10800557",   # film actor
            "Q2405480",    # voice actor
        ],
        "gender_filter": "Q6581097",  # female
        "limit": 300,
        "min_birth_year": 1975,
    },
    "youtuber": {
        "occupations": [
            "Q17125263",   # YouTuber
        ],
        "extra_queries": ["youtube_channel_holders"],
        "limit": 350,
        "min_birth_year": 1980,
    },
    "internet_personality": {
        "occupations": [
            "Q4964182",    # internet celebrity
            "Q66711686",   # influencer
        ],
        "limit": 400,
        "min_birth_year": 1975,
    },
    "meme": {
        "occupations": [
            "Q4964182",    # internet celebrity (fallback)
        ],
        "extra_queries": ["meme_subjects"],
        "limit": 250,
        "min_birth_year": 1960,
    },
}

# Profession labels for categories
CATEGORY_TO_PROFESSION = {
    "streamer": "Streamer",
    "tiktoker": "TikToker",
    "athlete": "Athlete",
    "actor": "Actor",
    "actress": "Actress",
    "youtuber": "YouTuber",
    "internet_personality": "Internet Personality",
    "meme": "Internet Personality",
}

# ── SPARQL Queries ───────────────────────────────────────────────────


def build_occupation_query(
    occupation_qids: list[str],
    limit: int,
    min_birth_year: int,
    gender_filter: Optional[str] = None,
) -> str:
    """Build a SPARQL query for humans with given occupations, image, DOB."""
    values = " ".join(f"wd:{q}" for q in occupation_qids)
    gender_clause = ""
    if gender_filter:
        gender_clause = f"?person wdt:P21 wd:{gender_filter} ."

    return f"""
SELECT DISTINCT ?person ?personLabel ?personDescription ?image ?birthDate
       ?genderLabel ?twitterHandle ?instagramHandle ?tiktokHandle ?youtubeChannelId
WHERE {{
  ?person wdt:P31 wd:Q5 ;
          wdt:P18 ?image ;
          wdt:P569 ?birthDate .
  VALUES ?occupation {{ {values} }}
  ?person wdt:P106 ?occupation .
  {gender_clause}
  FILTER(YEAR(?birthDate) >= {min_birth_year})
  FILTER(YEAR(?birthDate) <= {MIN_BIRTH_YEAR_FOR_ADULT})

  OPTIONAL {{ ?person wdt:P21 ?gender . }}
  OPTIONAL {{ ?person wdt:P2002 ?twitterHandle . }}
  OPTIONAL {{ ?person wdt:P2003 ?instagramHandle . }}
  OPTIONAL {{ ?person wdt:P7085 ?tiktokHandle . }}
  OPTIONAL {{ ?person wdt:P2397 ?youtubeChannelId . }}

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
}}
LIMIT {limit}
"""


def build_tiktok_handle_query(limit: int = 500) -> str:
    """Find people who have a TikTok handle and an image."""
    return f"""
SELECT DISTINCT ?person ?personLabel ?personDescription ?image ?birthDate
       ?genderLabel ?twitterHandle ?instagramHandle ?tiktokHandle ?youtubeChannelId
WHERE {{
  ?person wdt:P31 wd:Q5 ;
          wdt:P18 ?image ;
          wdt:P569 ?birthDate ;
          wdt:P7085 ?tiktokHandle .
  FILTER(YEAR(?birthDate) >= 1985)
  FILTER(YEAR(?birthDate) <= {MIN_BIRTH_YEAR_FOR_ADULT})

  OPTIONAL {{ ?person wdt:P21 ?gender . }}
  OPTIONAL {{ ?person wdt:P2002 ?twitterHandle . }}
  OPTIONAL {{ ?person wdt:P2003 ?instagramHandle . }}
  OPTIONAL {{ ?person wdt:P2397 ?youtubeChannelId . }}

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
}}
LIMIT {limit}
"""


def build_youtube_channel_query(limit: int = 350) -> str:
    """Find people who have a YouTube channel ID and an image."""
    return f"""
SELECT DISTINCT ?person ?personLabel ?personDescription ?image ?birthDate
       ?genderLabel ?twitterHandle ?instagramHandle ?tiktokHandle ?youtubeChannelId
WHERE {{
  ?person wdt:P31 wd:Q5 ;
          wdt:P18 ?image ;
          wdt:P569 ?birthDate ;
          wdt:P2397 ?youtubeChannelId .
  FILTER(YEAR(?birthDate) >= 1980)
  FILTER(YEAR(?birthDate) <= {MIN_BIRTH_YEAR_FOR_ADULT})

  OPTIONAL {{ ?person wdt:P21 ?gender . }}
  OPTIONAL {{ ?person wdt:P2002 ?twitterHandle . }}
  OPTIONAL {{ ?person wdt:P2003 ?instagramHandle . }}
  OPTIONAL {{ ?person wdt:P7085 ?tiktokHandle . }}

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
}}
LIMIT {limit}
"""


def build_meme_subjects_query(limit: int = 250) -> str:
    """Find people who are subjects of internet memes."""
    return f"""
SELECT DISTINCT ?person ?personLabel ?personDescription ?image ?birthDate
       ?genderLabel ?twitterHandle ?instagramHandle ?tiktokHandle ?youtubeChannelId
WHERE {{
  {{
    ?person wdt:P31 wd:Q5 ;
            wdt:P18 ?image ;
            wdt:P569 ?birthDate .
    ?meme wdt:P31/wdt:P279* wd:Q2927074 ;
          wdt:P921 ?person .
  }}
  UNION
  {{
    ?person wdt:P31 wd:Q5 ;
            wdt:P18 ?image ;
            wdt:P569 ?birthDate .
    ?meme wdt:P31/wdt:P279* wd:Q2927074 ;
          wdt:P180 ?person .
  }}
  FILTER(YEAR(?birthDate) >= 1960)
  FILTER(YEAR(?birthDate) <= {MIN_BIRTH_YEAR_FOR_ADULT})

  OPTIONAL {{ ?person wdt:P21 ?gender . }}
  OPTIONAL {{ ?person wdt:P2002 ?twitterHandle . }}
  OPTIONAL {{ ?person wdt:P2003 ?instagramHandle . }}
  OPTIONAL {{ ?person wdt:P7085 ?tiktokHandle . }}
  OPTIONAL {{ ?person wdt:P2397 ?youtubeChannelId . }}

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
}}
LIMIT {limit}
"""


# ── Wikidata Client ──────────────────────────────────────────────────


def run_sparql_query(query: str) -> list[dict]:
    """Execute a SPARQL query against Wikidata and return results."""
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": USER_AGENT,
    }
    params = {"query": query, "format": "json"}

    for attempt in range(3):
        try:
            resp = requests.get(
                WIKIDATA_SPARQL_URL,
                params=params,
                headers=headers,
                timeout=90,
            )
            if resp.status_code == 429:
                wait = 30 * (attempt + 1)
                log.warning(f"Rate limited by Wikidata, waiting {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", {}).get("bindings", [])
        except requests.exceptions.Timeout:
            log.warning(f"SPARQL query timed out (attempt {attempt + 1}/3)")
            time.sleep(10)
        except Exception as e:
            log.error(f"SPARQL query failed: {e}")
            if attempt < 2:
                time.sleep(5)
    return []


def extract_qid(uri: str) -> str:
    """Extract QID from a Wikidata entity URI."""
    return uri.rsplit("/", 1)[-1] if uri else ""


def parse_sparql_results(results: list[dict], category: str) -> list[Candidate]:
    """Parse SPARQL result bindings into Candidate objects."""
    candidates = {}

    for row in results:
        qid = extract_qid(row.get("person", {}).get("value", ""))
        if not qid:
            continue

        # Deduplicate within query results (multiple occupation matches)
        if qid in candidates:
            c = candidates[qid]
            # Merge handles if new ones found
            _merge_handles(c, row)
            continue

        name = row.get("personLabel", {}).get("value", "").strip()
        if not name or name == qid:  # Skip if label is just the QID
            continue

        description = row.get("personDescription", {}).get("value", "")
        image_uri = row.get("image", {}).get("value", "")
        birth_str = row.get("birthDate", {}).get("value", "")
        gender = row.get("genderLabel", {}).get("value", "")

        # Parse birth year
        birth_year = None
        if birth_str:
            try:
                birth_year = int(birth_str[:4])
            except (ValueError, IndexError):
                pass

        # Extract image filename from Commons URI
        headshot_filename = ""
        if image_uri:
            headshot_filename = urllib.parse.unquote(
                image_uri.rsplit("/", 1)[-1]
            )

        # Build platform handles
        handles = {}
        if row.get("twitterHandle", {}).get("value"):
            handles["twitter"] = row["twitterHandle"]["value"]
        if row.get("instagramHandle", {}).get("value"):
            handles["instagram"] = row["instagramHandle"]["value"]
        if row.get("tiktokHandle", {}).get("value"):
            handles["tiktok"] = row["tiktokHandle"]["value"]
        if row.get("youtubeChannelId", {}).get("value"):
            handles["youtube"] = row["youtubeChannelId"]["value"]

        c = Candidate(
            qid=qid,
            name=name,
            description=description,
            profession=CATEGORY_TO_PROFESSION.get(category, category.title()),
            category=category,
            birth_year=birth_year,
            gender=gender,
            platform_handles=handles,
            headshot_filename=headshot_filename,
            headshot_url=image_uri,
            source_urls=[f"https://www.wikidata.org/wiki/{qid}"],
        )
        candidates[qid] = c

    return list(candidates.values())


def _merge_handles(candidate: Candidate, row: dict):
    """Merge platform handles from a SPARQL row into an existing candidate."""
    if row.get("twitterHandle", {}).get("value"):
        candidate.platform_handles.setdefault(
            "twitter", row["twitterHandle"]["value"]
        )
    if row.get("instagramHandle", {}).get("value"):
        candidate.platform_handles.setdefault(
            "instagram", row["instagramHandle"]["value"]
        )
    if row.get("tiktokHandle", {}).get("value"):
        candidate.platform_handles.setdefault(
            "tiktok", row["tiktokHandle"]["value"]
        )
    if row.get("youtubeChannelId", {}).get("value"):
        candidate.platform_handles.setdefault(
            "youtube", row["youtubeChannelId"]["value"]
        )


# ── Step 1: Candidate Discovery ─────────────────────────────────────


def discover_candidates() -> list[Candidate]:
    """Run all SPARQL queries and collect candidates."""
    cache_file = INTERMEDIATE_DIR / "candidates_raw.jsonl"
    if cache_file.exists():
        log.info(f"Loading cached raw candidates from {cache_file}")
        return _load_candidates(cache_file)

    all_candidates: list[Candidate] = []
    seen_qids: set[str] = set()

    for category, config in CATEGORY_CONFIG.items():
        log.info(f"── Discovering: {category} ──")

        # Primary query: occupation-based
        query = build_occupation_query(
            occupation_qids=config["occupations"],
            limit=config["limit"],
            min_birth_year=config["min_birth_year"],
            gender_filter=config.get("gender_filter"),
        )
        log.info(f"  Running primary SPARQL query (limit {config['limit']})...")
        results = run_sparql_query(query)
        candidates = parse_sparql_results(results, category)
        new_count = 0
        for c in candidates:
            if c.qid not in seen_qids:
                seen_qids.add(c.qid)
                all_candidates.append(c)
                new_count += 1
        log.info(f"  Primary query: {len(results)} results → {new_count} new candidates")
        time.sleep(SPARQL_DELAY)

        # Extra queries for specific categories
        extra_queries = config.get("extra_queries", [])
        for eq in extra_queries:
            if eq == "tiktok_handle_holders":
                log.info("  Running extra query: TikTok handle holders...")
                q = build_tiktok_handle_query(config["limit"])
            elif eq == "youtube_channel_holders":
                log.info("  Running extra query: YouTube channel holders...")
                q = build_youtube_channel_query(config["limit"])
            elif eq == "meme_subjects":
                log.info("  Running extra query: meme subjects...")
                q = build_meme_subjects_query(config["limit"])
            else:
                continue

            results = run_sparql_query(q)
            candidates = parse_sparql_results(results, category)
            new_count = 0
            for c in candidates:
                if c.qid not in seen_qids:
                    seen_qids.add(c.qid)
                    all_candidates.append(c)
                    new_count += 1
            log.info(f"  Extra query ({eq}): {len(results)} results → {new_count} new candidates")
            time.sleep(SPARQL_DELAY)

    log.info(f"Total raw candidates: {len(all_candidates)}")
    _save_candidates(all_candidates, cache_file)
    return all_candidates


# ── Step 2: Headshot Resolution ──────────────────────────────────────


def resolve_headshots(candidates: list[Candidate]) -> list[Candidate]:
    """Resolve headshot URLs, licenses, and attribution from Commons."""
    cache_file = INTERMEDIATE_DIR / "candidates_with_headshots.jsonl"
    if cache_file.exists():
        log.info(f"Loading cached headshot data from {cache_file}")
        return _load_candidates(cache_file)

    log.info(f"Resolving headshots for {len(candidates)} candidates...")
    resolved = []

    for c in tqdm(candidates, desc="Resolving headshots"):
        if not c.headshot_filename:
            continue

        info = _fetch_commons_image_info(c.headshot_filename)
        if not info:
            continue

        # Extract license
        ext = info.get("extmetadata", {})
        license_name = ext.get("LicenseShortName", {}).get("value", "")
        attribution = ext.get("Artist", {}).get("value", "")
        # Clean HTML from attribution
        attribution = re.sub(r"<[^>]+>", "", attribution).strip()

        width = info.get("width", 0)
        height = info.get("height", 0)

        # Build the stable Commons URL (thumb at 512px)
        thumb_url = info.get("thumburl", "")
        original_url = info.get("url", "")
        display_url = thumb_url if thumb_url else original_url

        c.headshot_url = display_url
        c.headshot_source = f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(c.headshot_filename)}"
        c.headshot_license = license_name
        c.headshot_attribution = attribution
        c.headshot_width = width
        c.headshot_height = height
        c.last_verified_at = datetime.now(timezone.utc).isoformat()

        resolved.append(c)
        time.sleep(COMMONS_API_DELAY)

    log.info(f"Headshots resolved: {len(resolved)} / {len(candidates)}")
    _save_candidates(resolved, cache_file)
    return resolved


def _fetch_commons_image_info(filename: str) -> Optional[dict]:
    """Fetch image info (license, dimensions, thumb URL) from Commons API."""
    params = {
        "action": "query",
        "titles": f"File:{filename}",
        "prop": "imageinfo",
        "iiprop": "extmetadata|url|size|thumburl",
        "iiurlwidth": 512,
        "format": "json",
    }
    headers = {"User-Agent": USER_AGENT}

    for attempt in range(3):
        try:
            resp = requests.get(
                COMMONS_API_URL, params=params, headers=headers, timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                ii = page.get("imageinfo", [])
                if ii:
                    return ii[0]
            return None
        except Exception as e:
            log.debug(f"Commons API error for {filename}: {e}")
            if attempt < 2:
                time.sleep(2)
    return None


# ── Step 3: Safety Filtering ────────────────────────────────────────


def apply_safety_filters(
    candidates: list[Candidate], audit_log: list[AuditEntry]
) -> list[Candidate]:
    """Remove minors, suspected minors, and records without compliant headshots."""
    cache_file = INTERMEDIATE_DIR / "candidates_filtered.jsonl"
    if cache_file.exists():
        log.info(f"Loading cached filtered candidates from {cache_file}")
        return _load_candidates(cache_file)

    log.info(f"Applying safety filters to {len(candidates)} candidates...")
    safe = []

    for c in candidates:
        # Filter: must have birth year
        if c.birth_year is None:
            audit_log.append(AuditEntry(
                person_qid=c.qid,
                person_name=c.name,
                action="excluded",
                details={"reason": "missing_birth_year"},
            ))
            continue

        # Filter: must be 18+
        if c.birth_year > MIN_BIRTH_YEAR_FOR_ADULT:
            audit_log.append(AuditEntry(
                person_qid=c.qid,
                person_name=c.name,
                action="excluded",
                details={"reason": "under_18", "birth_year": c.birth_year},
            ))
            continue

        # Filter: check suspected minor signals in description
        desc_lower = (c.description or "").lower()
        is_suspected = False
        for signal in SUSPECTED_MINOR_SIGNALS:
            if signal.lower() in desc_lower:
                is_suspected = True
                audit_log.append(AuditEntry(
                    person_qid=c.qid,
                    person_name=c.name,
                    action="excluded",
                    details={
                        "reason": "suspected_minor_signal",
                        "signal": signal,
                        "description": c.description,
                    },
                ))
                break
        if is_suspected:
            continue

        # Filter: must have a compliant headshot
        if not c.headshot_url:
            audit_log.append(AuditEntry(
                person_qid=c.qid,
                person_name=c.name,
                action="excluded",
                details={"reason": "no_headshot"},
            ))
            continue

        # Filter: must have license info
        if not c.headshot_license:
            audit_log.append(AuditEntry(
                person_qid=c.qid,
                person_name=c.name,
                action="excluded",
                details={"reason": "no_license"},
            ))
            continue

        # Filter: minimum image resolution (either dimension >= 256px)
        if c.headshot_width < 256 and c.headshot_height < 256:
            audit_log.append(AuditEntry(
                person_qid=c.qid,
                person_name=c.name,
                action="excluded",
                details={
                    "reason": "image_too_small",
                    "width": c.headshot_width,
                    "height": c.headshot_height,
                },
            ))
            continue

        audit_log.append(AuditEntry(
            person_qid=c.qid,
            person_name=c.name,
            action="included",
            details={"category": c.category, "birth_year": c.birth_year},
        ))
        safe.append(c)

    log.info(f"After safety filter: {len(safe)} / {len(candidates)}")
    _save_candidates(safe, cache_file)
    return safe


# ── Step 4: Deduplication ────────────────────────────────────────────


def deduplicate(candidates: list[Candidate]) -> list[Candidate]:
    """Deduplicate by QID, then by platform handles, then by fuzzy name."""
    cache_file = INTERMEDIATE_DIR / "candidates_deduped.jsonl"
    if cache_file.exists():
        log.info(f"Loading cached deduped candidates from {cache_file}")
        return _load_candidates(cache_file)

    log.info(f"Deduplicating {len(candidates)} candidates...")

    # Pass 1: QID dedup (should already be unique, but just in case)
    by_qid: dict[str, Candidate] = {}
    for c in candidates:
        if c.qid not in by_qid:
            by_qid[c.qid] = c

    # Pass 2: Handle-based dedup (same Twitter/IG/TikTok = same person)
    handle_map: dict[str, str] = {}  # handle_key → qid
    dupes_by_handle = set()
    for c in by_qid.values():
        for platform, handle in c.platform_handles.items():
            key = f"{platform}:{handle.lower()}"
            if key in handle_map and handle_map[key] != c.qid:
                dupes_by_handle.add(c.qid)  # keep the first one
            else:
                handle_map[key] = c.qid

    # Pass 3: Fuzzy name dedup (normalized name collision)
    name_map: dict[str, str] = {}  # normalized_name → qid
    dupes_by_name = set()
    for c in by_qid.values():
        if c.qid in dupes_by_handle:
            continue
        norm = _normalize_name(c.name)
        if norm in name_map and name_map[norm] != c.qid:
            dupes_by_name.add(c.qid)  # keep the first one
        else:
            name_map[norm] = c.qid

    all_dupes = dupes_by_handle | dupes_by_name
    deduped = [c for c in by_qid.values() if c.qid not in all_dupes]

    removed = len(by_qid) - len(deduped)
    log.info(f"Deduplication removed {removed} records → {len(deduped)} remain")
    _save_candidates(deduped, cache_file)
    return deduped


def _normalize_name(name: str) -> str:
    """Normalize a name for fuzzy matching."""
    n = name.lower().strip()
    n = re.sub(r"[^a-z0-9\s]", "", n)
    n = re.sub(r"\s+", " ", n)
    return n


# ── Step 5: Export ───────────────────────────────────────────────────


def export_jsonl(candidates: list[Candidate], path: Path):
    """Export candidates to JSONL format."""
    with open(path, "w", encoding="utf-8") as f:
        for c in candidates:
            record = _candidate_to_record(c)
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    log.info(f"Exported {len(candidates)} records to {path}")


def export_csv(candidates: list[Candidate], path: Path):
    """Export candidates to CSV format."""
    fieldnames = [
        "name", "profession", "category", "aliases", "platform_handles",
        "headshot_url", "headshot_source", "headshot_license",
        "headshot_attribution", "source_urls", "wikidata_qid",
        "birth_year", "last_verified_at",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for c in candidates:
            record = _candidate_to_record(c)
            # Flatten lists/dicts for CSV
            record["aliases"] = "; ".join(record.get("aliases", []))
            record["platform_handles"] = json.dumps(record.get("platform_handles", {}))
            record["source_urls"] = "; ".join(record.get("source_urls", []))
            writer.writerow(record)
    log.info(f"Exported {len(candidates)} records to {path}")


def export_audit_log(audit_log: list[AuditEntry], path: Path):
    """Export audit log to JSONL."""
    with open(path, "w", encoding="utf-8") as f:
        for entry in audit_log:
            record = asdict(entry)
            record["created_at"] = record["created_at"] or datetime.now(timezone.utc).isoformat()
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    log.info(f"Exported {len(audit_log)} audit entries to {path}")


def _candidate_to_record(c: Candidate) -> dict:
    """Convert a Candidate to the output record schema."""
    return {
        "name": c.name,
        "profession": c.profession,
        "category": c.category,
        "aliases": c.aliases,
        "platform_handles": c.platform_handles,
        "headshot_url": c.headshot_url,
        "headshot_source": c.headshot_source,
        "headshot_license": c.headshot_license,
        "headshot_attribution": c.headshot_attribution,
        "source_urls": c.source_urls,
        "wikidata_qid": c.qid,
        "birth_year": c.birth_year,
        "last_verified_at": c.last_verified_at,
    }


# ── Step 6: Supabase Upload ─────────────────────────────────────────


def upload_to_supabase(candidates: list[Candidate], audit_log: list[AuditEntry]):
    """Upload candidates and audit log to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.warning("Supabase credentials not set, skipping upload.")
        return

    log.info(f"Uploading {len(candidates)} people to Supabase...")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    # Upload people in batches
    people_url = f"{SUPABASE_URL}/rest/v1/people"
    success_count = 0
    error_count = 0

    for i in tqdm(range(0, len(candidates), SUPABASE_BATCH_SIZE), desc="Uploading people"):
        batch = candidates[i : i + SUPABASE_BATCH_SIZE]
        records = []
        for c in batch:
            r = _candidate_to_record(c)
            r["last_verified_at"] = c.last_verified_at or datetime.now(timezone.utc).isoformat()
            records.append(r)

        try:
            resp = requests.post(
                people_url, json=records, headers=headers, timeout=30
            )
            if resp.status_code in (200, 201):
                success_count += len(batch)
            else:
                log.error(f"Supabase people insert failed ({resp.status_code}): {resp.text[:300]}")
                error_count += len(batch)
        except Exception as e:
            log.error(f"Supabase people insert error: {e}")
            error_count += len(batch)

        time.sleep(0.2)

    log.info(f"People upload: {success_count} success, {error_count} errors")

    # Upload audit log in batches
    audit_url = f"{SUPABASE_URL}/rest/v1/audit_log"
    log.info(f"Uploading {len(audit_log)} audit entries...")

    for i in range(0, len(audit_log), SUPABASE_BATCH_SIZE):
        batch = audit_log[i : i + SUPABASE_BATCH_SIZE]
        records = []
        for entry in batch:
            r = asdict(entry)
            r["created_at"] = r["created_at"] or datetime.now(timezone.utc).isoformat()
            records.append(r)

        try:
            resp = requests.post(
                audit_url, json=records, headers=headers, timeout=30
            )
            if resp.status_code not in (200, 201):
                log.error(f"Supabase audit insert failed ({resp.status_code}): {resp.text[:200]}")
        except Exception as e:
            log.error(f"Supabase audit insert error: {e}")

        time.sleep(0.1)

    log.info("Supabase upload complete.")


# ── Utility: Candidate Serialization ─────────────────────────────────


def _save_candidates(candidates: list[Candidate], path: Path):
    """Save candidates to a JSONL cache file."""
    with open(path, "w", encoding="utf-8") as f:
        for c in candidates:
            f.write(json.dumps(asdict(c), ensure_ascii=False) + "\n")


def _load_candidates(path: Path) -> list[Candidate]:
    """Load candidates from a JSONL cache file."""
    candidates = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                data = json.loads(line)
                candidates.append(Candidate(**data))
    return candidates


# ── QA Checks ────────────────────────────────────────────────────────


def run_qa_checks(candidates: list[Candidate], audit_log: list[AuditEntry]):
    """Run quality assurance checks on the final dataset."""
    log.info("=" * 60)
    log.info("QA CHECKS")
    log.info("=" * 60)

    # Check 1: All records have required fields
    missing_fields = 0
    for c in candidates:
        if not all([c.name, c.profession, c.headshot_url, c.headshot_source,
                     c.headshot_license, c.headshot_attribution]):
            missing_fields += 1
    status = "PASS" if missing_fields == 0 else "FAIL"
    log.info(f"  [{status}] All records have required fields ({missing_fields} missing)")

    # Check 2: No minors
    minors = [c for c in candidates if c.birth_year and c.birth_year > MIN_BIRTH_YEAR_FOR_ADULT]
    status = "PASS" if len(minors) == 0 else "FAIL"
    log.info(f"  [{status}] No minors in public seed ({len(minors)} found)")

    # Check 3: Audit log present
    status = "PASS" if len(audit_log) > 0 else "FAIL"
    log.info(f"  [{status}] Audit log present ({len(audit_log)} entries)")

    # Category breakdown
    log.info("")
    log.info("CATEGORY BREAKDOWN:")
    cat_counts: dict[str, int] = {}
    for c in candidates:
        cat_counts[c.category] = cat_counts.get(c.category, 0) + 1

    total = 0
    for cat, config in CATEGORY_CONFIG.items():
        count = cat_counts.get(cat, 0)
        target = config.get("limit", 0)
        pct = (count / target * 100) if target else 0
        marker = "✓" if count >= config.get("limit", 0) * 0.5 else "⚠"
        log.info(f"  {marker} {cat:25s} {count:5d}  (target ~{target})")
        total += count

    log.info(f"  {'─' * 40}")
    log.info(f"    {'TOTAL':25s} {total:5d}  (target 1500)")
    log.info("=" * 60)


# ── Main Pipeline ────────────────────────────────────────────────────


def main():
    log.info("=" * 60)
    log.info("SEED PEOPLE DB v1 — Gen Z Public Figures Pipeline")
    log.info("=" * 60)
    start_time = time.time()
    audit_log: list[AuditEntry] = []

    # Step 1: Candidate Discovery
    log.info("\n── Step 1: Candidate Discovery ──")
    candidates = discover_candidates()

    # Step 2: Headshot Resolution
    log.info("\n── Step 2: Headshot Resolution ──")
    candidates = resolve_headshots(candidates)

    # Step 3: Safety Filtering
    log.info("\n── Step 3: Safety Filtering ──")
    candidates = apply_safety_filters(candidates, audit_log)

    # Step 4: Deduplication
    log.info("\n── Step 4: Deduplication ──")
    candidates = deduplicate(candidates)

    # Step 5: Export to files
    log.info("\n── Step 5: Export ──")
    export_jsonl(candidates, OUTPUT_DIR / "people_seed_v1.jsonl")
    export_csv(candidates, OUTPUT_DIR / "people_seed_v1.csv")
    export_audit_log(audit_log, OUTPUT_DIR / "audit_log.jsonl")

    # Step 6: Upload to Supabase
    log.info("\n── Step 6: Supabase Upload ──")
    upload_to_supabase(candidates, audit_log)

    # QA Checks
    log.info("\n── QA Checks ──")
    run_qa_checks(candidates, audit_log)

    elapsed = time.time() - start_time
    log.info(f"\nPipeline complete in {elapsed:.1f}s ({elapsed / 60:.1f} min)")
    log.info(f"Final dataset: {len(candidates)} people")
    log.info(f"Audit log: {len(audit_log)} entries")
    log.info(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
