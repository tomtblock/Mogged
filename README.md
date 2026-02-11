# mogged.chat

A pairwise voting platform where users decide **who mogs who**. Pick between two people, see live leaderboards, submit new moggers, and create custom matchups. Built with Next.js 15, Supabase, and Stripe.

## Features

- **Battle Arena** — Two cards appear side by side. Click the one who mogs. The loser gets stamped "MOGGED".
- **Elo Ratings** — Every vote updates an Elo-based rating system. The best rise to the top.
- **Leaderboards** — Browse rankings by category (TikToker, YouTuber, Athlete, etc.) and gender.
- **Custom Matchups** — Search for any two people and pit them against each other.
- **Multi-Category Filters** — Select multiple professions at once to narrow your matchups.
- **Submit a Mogger** — Know someone who mogs? Upload their name, profession, headshot, and socials. Submissions are reviewed before going live.
- **Free Trial** — 3 free votes for guests, then a subscription paywall kicks in.
- **Pro Subscription** — Unlimited voting, private games, uploads, and full leaderboard access via Stripe.
- **Dev Toolbar** — Toggle between Normal mode (3 free votes) and Pro testnet (all features unlocked) during development.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, TypeScript) |
| Styling | [TailwindCSS 4](https://tailwindcss.com/) + custom dark/neon theme |
| Auth | [Supabase Auth](https://supabase.com/auth) (Google OAuth) |
| Database | [Supabase Postgres](https://supabase.com/) with Row Level Security |
| Storage | Supabase Storage (headshots, submissions) |
| Payments | [Stripe](https://stripe.com/) (Billing, Payment Element, Customer Portal, Webhooks) |
| Hosting | [Vercel](https://vercel.com/) |

## Getting Started

### Prerequisites

- **Node.js 18+**
- A [Supabase](https://supabase.com/) project
- A [Stripe](https://stripe.com/) account
- Google OAuth credentials (for Supabase Auth)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

ADMIN_EMAIL_ALLOWLIST=
```

### 3. Run the database migration

Apply the schema to your Supabase project:

```bash
# In the Supabase SQL Editor, run:
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, RLS policies, RPC functions (Elo voting, matchmaking), and storage buckets.

### 4. Seed the database

Import the initial people dataset:

```bash
node seed-people-db/import-to-supabase.mjs
```

This loads ~2,300 public figures with names, professions, categories, and headshot URLs.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
mogged.chat/
├── app/
│   ├── page.tsx                 # Landing page (trending + top moggers)
│   ├── landing.tsx              # Landing page client component
│   ├── battle/
│   │   ├── page.tsx             # Battle page (server)
│   │   └── arena.tsx            # Battle arena (client, voting logic)
│   ├── leaderboards/            # Ranked leaderboard pages
│   ├── submit/                  # Submit new mogger form
│   ├── subscribe/               # Stripe subscription page
│   ├── account/                 # User account management
│   ├── admin/                   # Admin moderation + stats
│   ├── games/                   # Private games
│   ├── p/[slug]/                # Public profile pages
│   └── api/
│       ├── match/next/          # Matchmaking API
│       ├── vote/                # Vote submission API
│       ├── search/              # People search API
│       ├── submit-mogger/       # Mogger submission API
│       ├── stripe/              # Stripe webhooks + billing
│       └── admin/               # Admin endpoints
├── components/
│   ├── battle-card.tsx          # Voting card with MOGS/MOGGED stamps
│   ├── matchup-picker.tsx       # Custom matchup search modal
│   ├── filter-drawer.tsx        # Multi-select category filter
│   ├── signup-modal.tsx         # Paywall modal
│   ├── dev-toolbar.tsx          # Normal/Pro test mode toggle
│   ├── nav.tsx                  # Navigation bar
│   └── leaderboard-table.tsx    # Ranked table component
├── lib/
│   ├── supabase/                # Supabase client + middleware
│   ├── stripe/                  # Stripe server helpers
│   ├── test-mode.ts             # Dev test mode utilities
│   └── types.ts                 # TypeScript interfaces
├── supabase/
│   └── migrations/              # SQL migration files
└── seed-people-db/              # Database seeding scripts
```

## Test Modes

A floating dev toolbar appears at the bottom of the page in development:

| Mode | Behavior |
|------|----------|
| **Normal** | 3 free votes, then paywall. Guest experience. |
| **Pro** | All features unlocked. Simulates active subscription. No vote limits. |

Toggle between them to test both flows without needing a real Stripe subscription. The mode is stored in a cookie and resets free votes on switch.

## Deployment

### Vercel

```bash
vercel
```

Set all environment variables in the Vercel dashboard. Make sure to configure:

- Stripe webhook endpoint: `https://your-domain.com/api/stripe/webhook`
- Supabase Auth redirect URL: `https://your-domain.com/auth/callback`
- Google OAuth redirect in Google Cloud Console

### Production checklist

- [ ] Switch Stripe keys from test to live
- [ ] Set `NEXT_PUBLIC_ENABLE_TEST_MODE=false` (hides dev toolbar)
- [ ] Configure Stripe webhook for production URL
- [ ] Set up Google OAuth redirect for production domain
- [ ] Review Supabase RLS policies
- [ ] Set admin email allowlist

## License

Private. All rights reserved.
