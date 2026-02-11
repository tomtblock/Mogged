---
name: trending-report
description: Scan X, Instagram, and TikTok for trending reels, sounds, and videos, then compile a daily trend report. Can be triggered on demand or by cron.
user-invocable: true
metadata: {"openclaw":{"requires":{"config":["browser.enabled"]}}}
---

# Trending Report — Social Media Trend Scanner

You are running the **trending-report** skill. Your job is to scan X (Twitter), Instagram, and TikTok for the content that is gaining the most traction right now, then compile a structured, actionable trend report.

This skill can be triggered two ways:
- **Scheduled (cron):** Runs daily at 23:00 and delivers via WhatsApp.
- **On demand:** The user messages you (e.g., "run trending report", "what's trending", "/trending-report"). Run the full scan and reply directly in the conversation.

## Geographic Targeting

**IMPORTANT: Target US/UK/Western content only.** The user wants trends from the United States, United Kingdom, and Western nations — NOT South American, Asian, or other regional content.

To ensure Western-focused results:

1. **Set the browser locale and timezone before scanning:**
   - Use the browser tool to set locale to `en-US` and timezone to `America/New_York`.
   - This signals to platforms that you're browsing from the US.

2. **Use English-language URLs and parameters where available:**
   - TikTok: navigate to `https://www.tiktok.com/explore?lang=en` 
   - Instagram: use `?hl=en` parameter if needed
   - X: settings should default to English if logged in with an English account

3. **When using `web_search`**, always pass `country: "US"` and `search_lang: "en"` to get US/Western results.

4. **Skip non-English content.** If a trending video or reel is not in English or not relevant to a US/UK/Western audience, skip it and find the next one.

## Pre-flight

1. Make sure the OpenClaw browser is running:
   - Use the `browser` tool with `action: "status"` and `profile: "openclaw"`.
   - If the browser is not running, start it with `action: "start"`.
2. **Set the browser to US locale:**
   - Use the browser tool to set locale to `en-US` and timezone to `America/New_York`.
3. You must already be logged in to X, Instagram, and TikTok in the openclaw browser profile. If a site asks you to log in, **stop and tell the user** — never type credentials yourself.

## Platform Scan Procedures

### 1. X (Twitter) — Trending Topics & Viral Videos

**Step A — Explore page:**
- Navigate to `https://x.com/explore/tabs/trending`
- If X offers a location/region setting, set it to "United States" or "United Kingdom".
- Take a snapshot and extract the top 15-20 trending topics/hashtags.
- Note any that are video/reel related. **Skip non-English trends.**

**Step B — Viral videos:**
- Navigate to `https://x.com/explore/tabs/for_you` or `https://x.com/explore`
- Scroll and snapshot to find posts with high engagement (views, retweets, likes).
- Focus on **video content** from US/UK/Western creators.
- For each video, note the creator handle, description, approximate view/like count.
- **CRITICAL: Copy the direct URL to the post** (e.g., `https://x.com/username/status/123456`). Every video must have a clickable link.

**Step C — Trending sounds/audio (if visible):**
- On video posts, note any audio tags, song names, or sound references.

**Collect for X:**
- Top 10 trending topics/hashtags
- Top 5-10 viral video posts (handle, description, engagement metrics, URL)
- Any notable audio/sound trends

### 2. Instagram — Trending Reels & Sounds

**Step A — Reels Explore:**
- Navigate to `https://www.instagram.com/reels/?hl=en` (or `https://www.instagram.com/explore/?hl=en`)
- Take a snapshot. Instagram's explore/reels page shows algorithmically surfaced trending content.
- Click into the top 10-15 reels. **Skip non-English content.** For each:
  - Note the creator handle, caption/description, approximate like/view count.
  - Note the **audio/sound name** shown at the bottom of the reel (this is key for trend tracking).
  - **CRITICAL: Copy the direct reel URL** (e.g., `https://www.instagram.com/reel/ABC123/`). Every reel must have a clickable link.

**Step B — Trending audio page:**
- If you see an audio link on a reel, click it to see how many reels use that sound.
- Note sounds that appear on multiple trending reels — these are the breakout sounds.

**Collect for Instagram:**
- Top 10-15 trending reels (creator, caption, engagement, URL)
- Top 5-10 trending sounds/audio (sound name, artist, number of reels using it)
- Any notable visual trends (formats, effects, editing styles)

### 3. TikTok — Trending Videos & Sounds

**Step A — Explore/Discover page:**
- Navigate to `https://www.tiktok.com/explore?lang=en` or `https://www.tiktok.com/trending?lang=en`
- Take a snapshot. Identify the featured/trending hashtags and videos.
- **Skip non-English content.** Focus on US/UK/Western creators.

**Step B — Trending content:**
- Click through the top 10-15 trending videos.
- For each, note: creator handle, description, approximate view/like/share count.
- Note the **sound/audio** used (shown at the bottom of each video).
- **CRITICAL: Copy the direct video URL** (e.g., `https://www.tiktok.com/@username/video/123456`). Every video must have a clickable link.

**Step C — Trending sounds:**
- If available, check `https://www.tiktok.com/music` or click into sound pages.
- Note sounds appearing across multiple trending videos.

**Collect for TikTok:**
- Top 10-15 trending videos (creator, description, engagement, URL)
- Top 5-10 trending sounds (name, artist, usage count if visible)
- Top trending hashtags/challenges

## Supplementary Web Search

After the browser scans, use `web_search` to cross-reference and fill gaps. **Always use `country: "US"` and `search_lang: "en"`** to get Western results:

- Search: `"trending TikTok sounds USA this week {current_date}"` (country: "US", search_lang: "en")
- Search: `"Instagram trending reels USA this week {current_date}"` (country: "US", search_lang: "en")
- Search: `"viral videos Twitter USA this week {current_date}"` (country: "US", search_lang: "en")
- Search: `"trending social media content USA UK {current_date}"` (country: "US", search_lang: "en")

Use the search results to validate what you saw in the browser and add any trends you may have missed. Prioritize US/UK/Western content.

## Report Format

**IMPORTANT — WhatsApp formatting rules:**
- NO markdown tables (WhatsApp does not render them). Use bullet lists instead.
- NO markdown headers with `#`. Use *bold* or CAPS for section titles.
- Wrap links in angle brackets to suppress embeds where needed.
- Keep the total report under 3500 characters per message. If longer, split into multiple messages (one per platform + summary).

Use this format:

```
*DAILY TRENDING REPORT — {date}*

*SUMMARY*
3-5 sentences on the biggest cross-platform trends today. Highlight any sounds, formats, or themes appearing on multiple platforms.

——————————————

*X (TWITTER)*

*Trending Topics*
1. #Topic — brief description
2. #Topic — brief description
(up to 10)

*Viral Videos*
- @handle — "Short desc" — ~1.2M views, ~50K likes
  https://x.com/handle/status/1234567890
- @handle — "Short desc" — ~800K views, ~30K likes
  https://x.com/handle/status/0987654321
(up to 5-10 — EVERY video MUST have a direct link)

*Audio Trends*
- Song/sound name — context

——————————————

*INSTAGRAM*

*Trending Reels*
- @handle — "Caption" — ~500K views, ~30K likes — Sound: "Song Name"
  https://www.instagram.com/reel/ABC123/
- @handle — "Caption" — ~300K views, ~20K likes — Sound: "Song Name"
  https://www.instagram.com/reel/DEF456/
(up to 10-15 — EVERY reel MUST have a direct link)

*Trending Sounds*
- "Sound Name" by Artist — ~10K reels using it
- "Sound Name" by Artist — ~8K reels using it
(up to 5-10)

*Visual/Format Trends*
- Description of trending editing styles, effects, or formats

——————————————

*TIKTOK*

*Trending Videos*
- @handle — "Short desc" — ~5M views, ~200K likes, ~50K shares — Sound: "Song Name"
  https://www.tiktok.com/@handle/video/1234567890
- @handle — "Short desc" — ~2M views, ~100K likes, ~25K shares — Sound: "Song Name"
  https://www.tiktok.com/@handle/video/0987654321
(up to 10-15 — EVERY video MUST have a direct link)

*Trending Sounds*
- "Sound Name" by Artist — ~50K videos using it
(up to 5-10)

*Trending Hashtags & Challenges*
1. #challenge — description, participation volume
2. #challenge — description
(up to 10)

——————————————

*CROSS-PLATFORM INSIGHTS*

*Sounds Trending Everywhere*
- "Sound Name" by Artist — trending on TikTok + Instagram (+ X)

*Content Formats Gaining Traction*
- Format description (e.g., "silent text overlay storytelling")

*Actionable Takeaways*
1. Specific, actionable insight
2. Another insight
3. Another insight
```

## Delivery

- **Always save the full report** to the workspace at `reports/trending-{YYYY-MM-DD}.md`.
- **If running from cron:** The cron job handles WhatsApp delivery automatically via the `announce` mechanism. Just output the report as your response — OpenClaw will deliver it. Split into multiple messages if needed (keep each under 3500 chars). Send the summary first, then one message per platform.
- **If running on demand (user asked via WhatsApp or Control UI):** Reply directly with the report in the conversation. Same formatting rules apply — split into multiple messages if the report is long.

## Execution Notes

- **Be thorough but realistic**: some metrics may be approximate. That's fine — note "~" for estimates.
- **If a platform blocks or requires login**, note it in the report and move on to the next.
- Each scan should take the browser tool 3-5 minutes per platform. Don't rush — scroll and explore thoroughly.
- **WhatsApp character limit**: keep each message chunk under 3500 characters. Split naturally at section boundaries (summary, then X, then Instagram, then TikTok, then cross-platform insights).
