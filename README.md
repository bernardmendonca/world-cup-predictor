# World Cup Predictor 2026

A football World Cup predictor game for small groups of friends (20-50 players). Predict match scores, earn points with odds multipliers, and compete on the leaderboard.

## Table of Contents

- [Features](#features)
- [Quick Start (Test Mode)](#quick-start-test-mode)
- [Environment Configuration](#environment-configuration)
- [Deployment Modes](#deployment-modes)
  - [Test Mode](#test-mode-deployment_modetest)
  - [Internal Mode](#internal-mode-deployment_modeinternal)
  - [External Mode](#external-mode-deployment_modeexternal)
- [Multi-Group Support](#multi-group-support)
- [Admin Guide](#admin-guide)
- [Scoring Rules](#scoring-rules)
- [Deploying on Railway](#deploying-on-railway)
- [Authentication (Invite Links)](#authentication-invite-links)
- [Admin Access](#admin-access)
- [Database](#database)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [License](#license)

## Features

- Batch prediction page — enter scores for all matches inline with one submit button
- Predictions remain visible as read-only after deadline (never hidden)
- Score predictions for all 104 matches (group + knockout stages)
- Penalty winner prediction for knockout draws
- Odds multiplier rewarding less popular correct predictions
- Favorite and minnow team bonuses (2x when your selected team wins as you predicted, stackable to 4x)
- Multi-group support — run multiple independent competitions on one instance
- Match prediction comparison — see everyone's predictions and scores for completed matches
- Admin panel for recording results and managing the knockout bracket
- Mobile-friendly responsive design with hamburger nav menu on small screens
- Local test mode with dummy players and time simulation

## Quick Start (Test Mode)

```bash
# Requires Node.js 20+
nvm use 20

# Install dependencies
npm install

# Run database migration and seed
npx prisma migrate dev
npm run db:seed

# Start dev server
npm run dev
```

Visit `http://localhost:3000`. In test mode, you'll see a link to the test group with 3 dummy players (Alice, Bob, Charlie) and full admin access.

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEPLOYMENT_MODE` | `test`, `internal`, or `external` | `test` |
| `DATABASE_URL` | Database connection string | `file:./data/predictor.db` |
| `AUTH_PROVIDER` | `sso` or `email` (legacy, not needed for invite links) | `email` |
| `ADMIN_EMAILS` | Comma-separated admin email addresses | `admin@example.com` |
| `ADMIN_SECRET` | Secret key for bootstrap admin access | — |
| `SESSION_DURATION_DAYS` | Session lifetime in days | `7` |
| `MAX_PLAYERS_PER_GROUP` | Max players allowed per group | `50` |
| `SSO_CLIENT_ID` | OAuth client ID (internal mode) | — |
| `SSO_CLIENT_SECRET` | OAuth client secret (internal mode) | — |
| `SSO_ISSUER_URL` | OAuth issuer URL (internal mode) | — |
| `EMAIL_FROM_ADDRESS` | Sender address for magic links | — |
| `EMAIL_SERVICE_API_KEY` | Email service API key (Resend, SES) | — |

## Deployment Modes

### Test Mode (`DEPLOYMENT_MODE=test`)

- Auth is bypassed — use the player switcher dropdown to switch between dummy players
- Admin panel is accessible to all players
- Time override available via the bar at the top of the page or `?time=2026-06-15T12:00:00Z` query param
- A "test-group" with 3 players is auto-created on first visit

### Internal Mode (`DEPLOYMENT_MODE=internal`)

For company deployments on AWS with SSO:

```env
DEPLOYMENT_MODE=internal
AUTH_PROVIDER=sso
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-secret
SSO_ISSUER_URL=https://your-sso-provider.com
ADMIN_EMAILS=you@company.com,co-admin@company.com
DATABASE_URL="file:/home/ec2-user/app/data/predictor.db"
```

Deploy on a single EC2 instance (t3.micro is sufficient). Use PM2 or systemd to keep the process running:

```bash
npm run build
pm2 start npm --name "predictor" -- start
```

### External Mode (`DEPLOYMENT_MODE=external`)

For friend groups on Railway/Render/Fly.io:

```env
DEPLOYMENT_MODE=external
AUTH_PROVIDER=email
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_SERVICE_API_KEY=re_xxxxx
ADMIN_EMAILS=you@gmail.com
DATABASE_URL="file:/data/predictor.db"
```

Players authenticate via magic link emails. Use a service like [Resend](https://resend.com) (free tier: 100 emails/day).

## Multi-Group Support

A single deployment supports multiple independent groups. Each group is identified by a URL slug:

- `/friends1/` — one group of friends
- `/work-buddies/` — another group
- `/family/` — yet another

Groups are created on-demand when the first player registers. Each group has its own:
- Players (max 50 per group)
- Predictions and scores
- Leaderboard
- Odds multipliers (calculated from that group's predictions only)

The same email can register in multiple groups independently.

## Admin Guide

### Who is an admin?

Anyone whose email is listed in the `ADMIN_EMAILS` environment variable. In test mode, all players have admin access. Admins are also regular participants — they can predict and appear on the leaderboard.

### Accessing the admin panel

Navigate to `/{groupSlug}/admin` (e.g., `/friends1/admin`). For first-time setup before any players exist, use `/{groupSlug}/admin?adminKey=YOUR_ADMIN_SECRET`.

### Recording match results

1. Go to the admin panel (Record Results tab)
2. All matches are listed with inline score inputs — enter home and away scores directly
3. Each match shows a prediction status chip (e.g., "8/12") so you know who's predicted
4. If the deadline is still open and predictions are missing, the names of players who haven't predicted are shown below the match — take a screenshot and share in your group chat
5. For knockout matches where you enter equal scores, penalty winner buttons appear inline
6. Click "Save All Results" to batch-save all new/changed results at once
7. Scores are calculated automatically for all players in the group

Results are idempotent — change any score and re-save to correct mistakes. All player scores will be recalculated.

### Managing the knockout bracket

1. Go to the admin panel, click "Assign Knockout Teams" tab
2. All unassigned knockout matches are listed with team dropdowns
3. Select home and away teams for each slot
4. Click "Assign All Teams" to batch-assign

Once teams are assigned, players can submit predictions for that match (up to 2 hours before kickoff).

### Recommended workflow

1. **Initial setup**: Access admin panel via `?adminKey=...`, create yourself as a player, log in via your invite link
2. **Add players**: Create all players in the admin panel, share invite links via WhatsApp/text
3. **Before tournament**: Everyone clicks their link and submits predictions for group stage matches
4. **Group stage**: Admin records results as matches finish
5. **After group stage**: Admin assigns R32 teams based on final standings
6. **Knockout rounds**: Players predict each round's matches. Admin records results and assigns next round's teams.
7. **Final**: Crown the leaderboard winner!

## Scoring Rules

### Match Prediction Comparison

After the prediction deadline passes for a match, a "Compare" button appears on the predict page for that match. Clicking it takes you to the match detail page where you can see everyone's predictions and odds. Once the admin records the final score, the page shows a full comparison table:

- Each player's predicted score (color-coded by accuracy)
- Accuracy badge: ✓ Exact, ~ Result, ✗ Wrong
- Points earned per player
- Collapsible detailed breakdown (base × odds × team)

Matches with open predictions are not clickable — they become accessible only once locked.

### Base Points
| Prediction | Points |
|-----------|--------|
| Correct exact score | 4 (1 + 3) |
| Correct result (wrong score) | 1 |
| Incorrect | 0 |

### Odds Multiplier (1.00 – 2.00)

Calculated per match from prediction distribution: `2 - (predictions_for_outcome / total_predictions)`. Less popular correct predictions earn more.

### Team Multiplier

The team multiplier rewards players who correctly predict the outcome of matches involving their selected favorite or minnow team. It applies in two scenarios:

**Scenario 1 — Win:** The player predicted their selected team to win AND that team actually won.

**Scenario 2 — Draw:** The player's selected team is playing in the match AND the player predicted a draw AND the match actually ended in a draw.

| Scenario | Multiplier |
|----------|-----------|
| No favorite/minnow qualifies | 1x |
| Favorite OR minnow qualifies (win or draw) | 2x |
| Same team is both favorite AND minnow, and qualifies | 4x |
| Favorite and minnow are different teams, both in a drawn match | 4x |

The multiplier does NOT apply if:
- The player predicted a different team to win than actually won
- The player predicted a win but the match was a draw (or vice versa)
- The player's selected team is not playing in the match

**Favorite team**: Any of the 48 participating teams. **Minnow team**: Only teams with FIFA ranking ≥ 44 (the 14 lowest-ranked teams in the tournament).

Both selections are made on the Predict page and saved with the "Save All Predictions" button.

### Final Score

```
total = base_points × odds_multiplier × team_multiplier
```

### Knockout Penalty Rules

When you predict equal scores in a knockout match, you must also select which team wins on penalties. You get points if both the draw and the penalty winner are correct. Additionally, if you predicted the correct advancing team to win outright (non-draw scoreline), you earn 1 base point — you got the right team through, just via the wrong method.

| Scenario | Base Points |
|----------|------------|
| Exact drawn score + correct penalty winner | 4 |
| Any draw + correct penalty winner (wrong score) | 1 |
| Predicted advancing team to win outright | 1 |
| Draw predicted + wrong penalty winner | 0 |
| Predicted the losing team to win outright | 0 |

Team multipliers also apply when you correctly identify the advancing team, whether via a penalty prediction or an outright win prediction.

## Deploying on Railway

Railway requires PostgreSQL instead of SQLite (Railway's filesystem is ephemeral).

### Prerequisites

1. Update `prisma/schema.prisma` to use PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Generate a new migration (remove old SQLite migrations first):

```bash
rm -rf prisma/migrations
mkdir -p prisma/migrations/20260606000000_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20260606000000_init/migration.sql
```

3. Create `prisma/migrations/migration_lock.toml`:

```toml
# Please do not edit this file manually
provider = "postgresql"
```

4. Commit and push to GitHub.

### Railway Setup

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub Repo** → select this repo.
3. Add a PostgreSQL database: click **+ New** → **Database** → **PostgreSQL**.
4. In your service's **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to the plugin — may be auto-linked) |
| `DEPLOYMENT_MODE` | `external` |
| `AUTH_PROVIDER` | `email` |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses |
| `ADMIN_SECRET` | A random string for bootstrap access (run `openssl rand -base64 32`) |
| `SESSION_DURATION_DAYS` | `7` |
| `MAX_PLAYERS_PER_GROUP` | `50` |

5. Set the **Build Command**:

```
npx prisma generate && npm run build
```

6. Set the **Start Command**:

```
npx prisma migrate deploy && npm run start
```

> **Important:** `prisma migrate deploy` must run at startup, not during build. The build step runs in an isolated container that cannot reach Railway's internal Postgres hostname (`postgres.railway.internal`). The internal network is only available at runtime.

### Seeding the Database

After the first successful deploy, seed the database using Railway's shell or CLI:

```bash
railway run npx tsx prisma/seed.ts
```

This loads all 104 World Cup 2026 fixtures and 48 teams.

### Custom Domain

In your service → **Settings** → **Networking** → **Generate Domain** (or add your own custom domain).

## Authentication (Invite Links)

This app uses a simple token-based invite link system — no passwords, no OAuth, no email service needed.

### How it works

1. The admin creates players in the admin panel (name + email)
2. Each player gets a unique invite URL: `https://your-app.up.railway.app/{group}/join/{token}`
3. When a player clicks their link, they're instantly logged in with a session cookie that lasts 60 days (the whole tournament)
4. No re-authentication needed — they stay logged in

### Bootstrap (first-time setup)

Before any players exist, you need a way to access the admin panel. Use the `ADMIN_SECRET` environment variable:

1. Set `ADMIN_SECRET` to a random string on Railway:
   ```
   ADMIN_SECRET=your-random-secret-here
   ```
   Generate one with: `openssl rand -base64 32`

2. Access the admin panel via: `https://your-app.up.railway.app/{group-slug}/admin?adminKey=your-random-secret-here`

3. Create yourself as the first player (use the email from `ADMIN_EMAILS`)

4. Click "Copy Invite Link" next to your name, open it in a new tab — you're now logged in as yourself

5. From now on, you can access the admin panel normally (because your email is in `ADMIN_EMAILS`)

### Inviting players

1. Go to the admin panel → Players tab
2. Enter name and email → click "Add Player"
3. Click "Copy Invite Link" next to their name
4. Share the link via WhatsApp, text, or email

### Being both admin and participant

You are a regular player and an admin simultaneously:
- Your player record has predictions, scores, and a leaderboard position like everyone else
- Your email in `ADMIN_EMAILS` grants you access to the admin panel on top of that

## Admin Access

Admin access is controlled by the `ADMIN_EMAILS` environment variable — a comma-separated list of email addresses:

```env
ADMIN_EMAILS=alice@example.com,bob@example.com
```

Any player whose email matches an entry in this list can access the admin panel at `/{groupSlug}/admin`. There is no database flag or UI for promoting users. To grant or revoke admin access, update the environment variable and redeploy.

In `test` deployment mode, the admin check is bypassed and all players have admin access.

## Database

### Local Development (SQLite)

For local development, use SQLite. Set the provider in `prisma/schema.prisma` to `sqlite` and configure:

```env
DATABASE_URL="file:./data/predictor.db"
```

### Production (PostgreSQL on Railway)

For Railway deployments, use PostgreSQL. Set the provider to `postgresql` and use the Railway-provided `DATABASE_URL`.

### Commands

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed teams and match schedule
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

## Running Tests

The project uses [Vitest](https://vitest.dev/) with [fast-check](https://github.com/dubzzz/fast-check) for property-based testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest

# Run a specific test file
npx vitest run src/__tests__/properties/base-points.property.test.ts
```

### Test Coverage

| Category | Tests | What's covered |
|----------|-------|----------------|
| Scoring formula | 4 | base × odds × team = total (rounded to 2dp) |
| Base points | 5 | Exact score (4), correct result (1), incorrect (0) |
| Odds multiplier | 5 | Formula, range [1.00-2.00], zero predictions, single prediction |
| Team multiplier | 16 | Win scenario (predicted team won), draw scenario (team in drawn match), both roles on same winner (4x), neither team in match (1x) |
| Knockout penalties | 5 | Penalty winner correctness, exact score with penalties |
| Score validation | 3 | Integer 0-20 accepted, everything else rejected |
| Deadlines | 6 | Group, knockout, team selection — all 2h before kickoff |
| Prediction persistence | 2 | Last-write-wins semantics |
| Penalty winner validation | 3 | Required when equal scores, null when unequal |
| Leaderboard ordering | 4 | Points desc → name asc |
| Timezone conversion | 2 | Four timezone outputs represent same instant |
| Match status | 3 | completed/in_progress/upcoming derivation |
| Group isolation | 5 | Leaderboard, odds, player limits scoped per group |
| Integration | 16 | Full pipeline, group isolation, deadline enforcement |

All property tests run with 100+ randomized iterations via fast-check.

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── [groupSlug]/              # Group-scoped pages
│   │   ├── layout.tsx            # Nav (Predict|Teams|Leaderboard|Rules|Admin), player switcher
│   │   ├── mobile-nav.tsx        # Hamburger menu for mobile screens (<640px)
│   │   ├── page.tsx              # Redirects to /predict
│   │   ├── predict/              # Batch prediction page (primary view)
│   │   │   ├── page.tsx          # Server component with filters
│   │   │   └── batch-prediction-form.tsx  # Client component with inline inputs
│   │   ├── matches/[matchId]/    # Match detail (results + scores)
│   │   ├── teams/                # Favorite/minnow selection
│   │   ├── leaderboard/          # Leaderboard
│   │   ├── rules/                # Scoring rules & examples
│   │   └── admin/                # Admin panel
│   └── api/[groupSlug]/          # API routes
│       ├── predictions/          # Prediction endpoints
│       ├── teams/                # Team selection endpoint
│       ├── admin/                # Admin endpoints
│       ├── auth/                 # Login/logout
│       └── test/                 # Test mode helpers
├── lib/                          # Business logic
│   ├── scoring/                  # Scoring engine
│   ├── predictions/              # Prediction services
│   ├── leaderboard/              # Leaderboard service
│   ├── matches/                  # Match service
│   ├── groups/                   # Group isolation
│   ├── auth/                     # Authentication
│   ├── test-mode/                # Test mode utilities
│   ├── utils/                    # Time, timezone helpers
│   ├── config.ts                 # Environment config
│   ├── db.ts                     # Prisma singleton
│   └── types.ts                  # Shared TypeScript types
├── middleware.ts                 # Auth middleware
prisma/
├── schema.prisma                 # Database schema
├── seed.ts                       # Seed script
└── migrations/                   # Migration history
data/
└── world-cup-2026-fixtures.json  # Tournament fixture data
```

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via Prisma ORM
- **Styling**: Tailwind CSS
- **Testing**: fast-check (property-based testing)

## License

Private — for personal/group use.
