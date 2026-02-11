#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# OpenClaw Trending Report Bot — Setup Script
# ──────────────────────────────────────────────────────────
# This script:
#   1. Installs OpenClaw (if not already installed)
#   2. Runs the onboarding wizard
#   3. Deploys the trending-report skill
#   4. Enables the browser
#   5. Configures WhatsApp channel
#   6. Creates the daily cron job (23:00 GMT-3, WhatsApp delivery)
#   7. Prompts you to log in to X, Instagram, TikTok
# ──────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_SRC="$SCRIPT_DIR/skills/trending-report"
SKILL_DST="$HOME/.openclaw/skills/trending-report"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpenClaw Trending Report Bot — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Check Node ──
echo "▸ Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || true)
if [[ -z "$NODE_VERSION" ]]; then
  echo "  ✗ Node.js is not installed. Please install Node 22+ first."
  echo "    https://nodejs.org/"
  exit 1
fi
echo "  ✓ Node $NODE_VERSION"
echo ""

# ── Step 2: Install OpenClaw ──
if command -v openclaw &>/dev/null; then
  echo "▸ OpenClaw is already installed."
  openclaw --version 2>/dev/null || true
else
  echo "▸ Installing OpenClaw..."
  curl -fsSL https://openclaw.ai/install.sh | bash
  echo ""
  export PATH="$HOME/.openclaw/bin:$PATH"
  if ! command -v openclaw &>/dev/null; then
    echo "  ✗ OpenClaw binary not found after install."
    echo "    Try opening a new terminal and running this script again."
    exit 1
  fi
fi
echo "  ✓ OpenClaw $(openclaw --version 2>/dev/null || echo 'installed')"
echo ""

# ── Step 3: Onboarding ──
echo "▸ Running onboarding wizard (skip if already done)..."
echo "  This will configure auth, gateway settings, etc."
echo "  If you've already onboarded, press Ctrl+C to skip this step."
echo ""
openclaw onboard --install-daemon || true
echo ""

# ── Step 4: Deploy the trending-report skill ──
echo "▸ Deploying trending-report skill..."
mkdir -p "$SKILL_DST"
cp "$SKILL_SRC/SKILL.md" "$SKILL_DST/SKILL.md"
echo "  ✓ Skill deployed to $SKILL_DST"
echo ""

# ── Step 5: Ensure reports directory exists in workspace ──
WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
mkdir -p "$WORKSPACE/reports"
echo "  ✓ Reports directory: $WORKSPACE/reports"
echo ""

# ── Step 6: Enable browser in config ──
echo "▸ Enabling browser..."
openclaw config set browser.enabled true 2>/dev/null || true
openclaw config set browser.defaultProfile openclaw 2>/dev/null || true
echo "  ✓ Browser enabled (profile: openclaw)"
echo ""

# ── Step 7: Configure WhatsApp ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  WhatsApp Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  The bot will send you daily reports on WhatsApp"
echo "  and you can request reports on demand by messaging it."
echo ""
echo "  Enter YOUR WhatsApp phone number (the number you"
echo "  message FROM, in E.164 format with country code)."
echo "  Example: +5511999998888  or  +14155551234"
echo ""
read -rp "  Your WhatsApp number: " WHATSAPP_NUMBER
if [[ -z "$WHATSAPP_NUMBER" ]]; then
  echo "  ✗ WhatsApp number is required. Please re-run setup."
  exit 1
fi

# Configure WhatsApp channel
echo ""
echo "▸ Configuring WhatsApp channel..."
openclaw config set channels.whatsapp.dmPolicy allowlist 2>/dev/null || true
openclaw config set channels.whatsapp.allowFrom "[\"$WHATSAPP_NUMBER\"]" 2>/dev/null || true
echo "  ✓ WhatsApp configured (allowlist: $WHATSAPP_NUMBER)"
echo ""

# ── Step 8: Link WhatsApp via QR ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Link WhatsApp"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  You need to link a WhatsApp number for the bot."
echo ""
echo "  RECOMMENDED: Use a separate/spare phone number."
echo "  You can also use WhatsApp Business on your main phone"
echo "  with a different number."
echo ""
echo "  The next command will show a QR code."
echo "  Scan it with WhatsApp > Settings > Linked Devices > Link a Device"
echo ""
read -rp "  Press Enter to show the QR code..." _dummy
openclaw channels login || true
echo ""

# ── Step 9: Start the gateway (if not running) ──
echo "▸ Checking gateway status..."
GATEWAY_STATUS=$(openclaw gateway status 2>&1 || true)
if echo "$GATEWAY_STATUS" | grep -qi "running"; then
  echo "  ✓ Gateway is already running."
else
  echo "  Starting gateway..."
  openclaw gateway start || openclaw gateway --port 18789 &
  sleep 3
  echo "  ✓ Gateway started."
fi
echo ""

# ── Step 10: Create the daily cron job ──
# Schedule: Every day at 23:00 GMT-3 (Etc/GMT+3 in IANA = UTC-3)
echo "▸ Creating daily cron job (23:00 GMT-3, WhatsApp delivery)..."

# Remove any existing trending-report cron job
openclaw cron remove trending-report 2>/dev/null || true

openclaw cron add \
  --name "trending-report" \
  --cron "0 23 * * *" \
  --tz "Etc/GMT+3" \
  --session isolated \
  --message "Run the trending-report skill. Use the browser to scan X (Twitter), Instagram, and TikTok for today's trending content. Follow the skill instructions precisely — use WhatsApp-friendly formatting (no markdown tables, use bullet lists). Save the full report to the workspace. Split the report across multiple messages if needed (summary first, then one per platform, then cross-platform insights)." \
  --model "claude-opus-4-6" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "$WHATSAPP_NUMBER"

echo ""
echo "  ✓ Daily cron job created!"
echo "    Schedule: Every day at 23:00 GMT-3"
echo "    Delivery: WhatsApp to $WHATSAPP_NUMBER"
echo ""

# ── Step 11: Verify ──
echo "▸ Verifying setup..."
openclaw cron list
echo ""

# ── Step 12: Browser login prompt ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IMPORTANT: Manual Browser Login Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  The bot needs browser access to scrape each platform."
echo "  OpenClaw uses a separate browser profile — your"
echo "  personal browser is not affected."
echo ""
echo "  Run these commands and log in manually:"
echo ""
echo "    openclaw browser start"
echo ""
echo "    # 1. X (Twitter)"
echo "    openclaw browser open https://x.com/login"
echo "    # Log in to X, then:"
echo ""
echo "    # 2. Instagram"
echo "    openclaw browser open https://www.instagram.com/accounts/login/"
echo "    # Log in to Instagram, then:"
echo ""
echo "    # 3. TikTok"
echo "    openclaw browser open https://www.tiktok.com/login"
echo "    # Log in to TikTok"
echo ""
echo "  Sessions persist in the openclaw browser profile."
echo ""

# ── Step 13: Optional web search setup ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Optional: Web Search API Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  For supplementary trend data, add a Brave Search API key:"
echo "    openclaw configure --section web"
echo ""
echo "  Free tier available at: https://brave.com/search/api/"
echo ""

# ── Done ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  DAILY REPORTS:"
echo "    Every day at 23:00 GMT-3 → WhatsApp"
echo ""
echo "  ON-DEMAND REPORTS:"
echo "    Message the bot on WhatsApp with:"
echo "      \"trending report\"  or  \"/trending-report\""
echo "    The bot will run a full scan and reply."
echo ""
echo "  TEST RIGHT NOW:"
echo "    openclaw cron run trending-report"
echo ""
echo "  OTHER COMMANDS:"
echo "    openclaw dashboard          # Web UI"
echo "    openclaw cron list           # See scheduled jobs"
echo "    openclaw cron runs --id trending-report"
echo "    openclaw channels status     # Check WhatsApp link"
echo ""
