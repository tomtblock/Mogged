# OpenClaw Trending Report Bot

A daily social media trend scanner that uses [OpenClaw](https://openclaw.ai) to browse X (Twitter), Instagram, and TikTok, then deliver a structured trend report to you on WhatsApp. You can also request a report on demand at any time.

## How it works

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Cron Job    │────▶│  OpenClaw Agent      │────▶│  WhatsApp    │
│  (daily)     │     │  + Browser Tool      │     │  (your phone)│
└──────────────┘     │  + Web Search        │     └──────────────┘
                     └──────┬──┬──┬─────────┘            ▲
                            │  │  │                      │
   You can also ────────────│──│──│──────────────────────┘
   message the bot          │  │  │   "what's trending?"
   on WhatsApp              │  │  │
                     ┌──────┘  │  └──────┐
                     ▼         ▼         ▼
                  ┌─────┐  ┌─────┐  ┌────────┐
                  │  X  │  │ IG  │  │ TikTok │
                  └─────┘  └─────┘  └────────┘
```

**Daily (scheduled):**
1. Cron job fires every day at 23:00 GMT-3
2. OpenClaw spins up an isolated agent session with the browser tool
3. The agent scans X explore, Instagram reels, and TikTok discover pages
4. Runs supplementary web searches to cross-reference
5. Compiles the report and delivers it to your WhatsApp

**On demand:**
- Message the bot on WhatsApp: "trending report", "what's trending?", or `/trending-report`
- The agent runs the full scan and replies directly in the chat

## Prerequisites

- **macOS or Linux** (Windows via WSL2)
- **Node.js 22+** — check with `node --version`
- A Chromium-based browser (Chrome, Brave, or Edge)
- Accounts on X, Instagram, and TikTok
- A WhatsApp number for the bot (spare phone recommended) or your personal number

## Quick Start

### 1. Run the setup script

```bash
cd ~/openclaw-trending-bot
./setup.sh
```

The script will:
- Install OpenClaw (if needed)
- Run the onboarding wizard
- Deploy the `trending-report` skill
- Ask for your WhatsApp number
- Link WhatsApp via QR code
- Create the daily cron job (23:00 GMT-3 → WhatsApp)

### 2. Link WhatsApp

During setup you'll be shown a QR code. Scan it with:
- **WhatsApp** → Settings → Linked Devices → Link a Device

**Recommended:** Use a separate phone number for the bot (e.g., a spare SIM or WhatsApp Business with a different number). You can also use your personal number with `selfChatMode`.

### 3. Log in to each platform in the browser

The OpenClaw browser is a **separate, isolated Chrome profile**. Log in once:

```bash
openclaw browser start

# X (Twitter)
openclaw browser open https://x.com/login

# Instagram
openclaw browser open https://www.instagram.com/accounts/login/

# TikTok
openclaw browser open https://www.tiktok.com/login
```

> **Important:** Never give OpenClaw your passwords. Always log in yourself.

### 4. Test it right now

```bash
# Force-run the cron job immediately
openclaw cron run trending-report
```

Or message the bot on WhatsApp:
> "run a trending report"

Watch it work:
```bash
openclaw dashboard
```

### 5. (Optional) Set up web search

```bash
openclaw configure --section web
```

Free tier at [brave.com/search/api](https://brave.com/search/api/).

## Using On Demand

Once the bot is set up, you can message it on WhatsApp at any time:

- "what's trending today?"
- "trending report"
- "give me a trend report"
- `/trending-report`

The bot will run a full browser scan of all three platforms and reply with the report directly in the chat. This typically takes 10-15 minutes.

## Configuration

### Change the schedule

```bash
# Edit the cron expression (currently: daily at 23:00)
openclaw cron edit trending-report --cron "0 23 * * *" --tz "Etc/GMT+3"
```

Cron expression format: `minute hour day-of-month month day-of-week`

Examples:
- `0 23 * * *` — Every day at 23:00 (current default)
- `0 9 * * 1` — Monday at 9:00 AM only
- `0 8,20 * * *` — Twice daily at 8:00 and 20:00
- `0 23 * * 1,3,5` — Mon/Wed/Fri at 23:00

### Change the WhatsApp target

```bash
openclaw cron edit trending-report --to "+5511999998888"
```

### Change the AI model

```bash
# Faster/cheaper
openclaw cron edit trending-report --model "sonnet"

# Most capable + deep thinking (current default)
openclaw cron edit trending-report --model "claude-opus-4-6" --thinking high
```

### Run headless (no visible browser)

```bash
openclaw config set browser.headless true
```

## WhatsApp Setup Details

### Dedicated number (recommended)

Use a spare phone number. Best UX:
- Old phone + cheap eSIM on Wi-Fi
- Or WhatsApp Business on your main phone with a different number

### Personal number (fallback)

If you use your own number, enable self-chat mode:

```bash
openclaw config set channels.whatsapp.selfChatMode true
```

Then message yourself ("Message yourself" in WhatsApp) to interact with the bot.

### Re-link WhatsApp

If the WhatsApp connection drops:

```bash
openclaw channels login
# Scan QR again
```

### Check WhatsApp status

```bash
openclaw channels status
```

## File Structure

```
~/openclaw-trending-bot/
├── README.md
├── setup.sh
├── openclaw-config.json5       # Reference config
└── skills/
    └── trending-report/
        └── SKILL.md            # The skill

~/.openclaw/
├── skills/
│   └── trending-report/
│       └── SKILL.md            # Deployed copy
├── workspace/
│   └── reports/
│       └── trending-YYYY-MM-DD.md  # Saved reports
├── credentials/
│   └── whatsapp/               # WhatsApp auth (auto-managed)
└── cron/
    └── jobs.json               # Cron definitions
```

## Useful Commands

```bash
# Test the report now
openclaw cron run trending-report

# Check cron status
openclaw cron list
openclaw cron runs --id trending-report --limit 10

# Check WhatsApp link
openclaw channels status

# Re-link WhatsApp
openclaw channels login

# Open dashboard
openclaw dashboard

# Check gateway
openclaw gateway status

# Browser status
openclaw browser status

# Read saved reports
ls ~/.openclaw/workspace/reports/
```

## Troubleshooting

### WhatsApp not linked
```bash
openclaw channels status
# If not linked:
openclaw channels login
```

### Report not arriving on WhatsApp
```bash
# Check cron ran successfully
openclaw cron runs --id trending-report --limit 5

# Check gateway is running
openclaw gateway status

# Check WhatsApp is connected
openclaw channels status

# Force a test run
openclaw cron run trending-report
```

### Platform asks to log in again
```bash
openclaw browser open https://x.com/login
# Log in manually in the browser window
```

### Bot doesn't respond to on-demand WhatsApp messages
- Make sure the gateway is running: `openclaw gateway status`
- Make sure WhatsApp is linked: `openclaw channels status`
- Make sure your number is in the allowlist: check `channels.whatsapp.allowFrom` in `~/.openclaw/openclaw.json`

## Customization

Edit the skill to add/remove platforms, change formatting, or adjust what data is collected:

```bash
nano ~/.openclaw/skills/trending-report/SKILL.md
```

Changes take effect on the next agent turn (no restart needed).

## Links

- [OpenClaw Docs](https://docs.openclaw.ai)
- [WhatsApp Channel](https://docs.openclaw.ai/channels/whatsapp)
- [Cron Jobs](https://docs.openclaw.ai/automation/cron-jobs)
- [Browser Tool](https://docs.openclaw.ai/tools/browser)
- [Skills](https://docs.openclaw.ai/tools/skills)
