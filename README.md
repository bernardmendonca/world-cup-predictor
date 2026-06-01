# World Cup Predictor 2026

A football World Cup predictor game for small groups of friends (20-50 players). Predict match scores, earn points with odds multipliers, and compete on the leaderboard.

## Features

- Batch prediction page — enter scores for all matches inline with one submit button
- Score predictions for all 104 matches (group + knockout stages)
- Penalty winner prediction for knockout draws
- Odds multiplier rewarding less popular correct predictions
- Favorite and minnow team bonuses (2x each, stackable to 4x)
- Multi-group support — run multiple independent competitions on one instance
- Admin panel for recording results and managing the knockout bracket
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
| `DATABASE_URL` | SQLite file path | `file:./data/predictor.db` |
| `AUTH_PROVIDER` | `sso` or `email` | `email` |
| `ADMIN_EMAILS` | Comma-separated admin email addresses | `admin@example.com` |
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

Anyone whose email is listed in the `ADMIN_EMAILS` environment variable. In test mode, all players have admin access.

### Accessing the admin panel

Navigate to `/{groupSlug}/admin` (e.g., `/friends1/admin`).

### Recording match results

1. Go to the admin panel (Record Results tab)
2. All matches are listed with inline score inputs — enter home and away scores directly
3. For knockout matches where you enter equal scores, penalty winner buttons appear inline
4. Click "Save All Results" to batch-save all new/changed results at once
5. Scores are calculated automatically for all players in the group

Results are idempotent — change any score and re-save to correct mistakes. All player scores will be recalculated.

### Managing the knockout bracket

1. Go to the admin panel, click "Assign Knockout Teams" tab
2. All unassigned knockout matches are listed with team dropdowns
3. Select home and away teams for each slot
4. Click "Assign All Teams" to batch-assign

Once teams are assigned, players can submit predictions for that match (up to 2 hours before kickoff).

### Recommended workflow

1. **Before tournament**: Share the group URL with friends, everyone registers
2. **Group stage**: Players predict all 72 matches. Admin records results as matches finish.
3. **After group stage**: Admin assigns R32 teams based on final standings
4. **Knockout rounds**: Players predict each round's matches. Admin records results and assigns next round's teams.
5. **Final**: Crown the leaderboard winner!

## Scoring Rules

### Base Points
| Prediction | Points |
|-----------|--------|
| Correct exact score | 4 (1 + 3) |
| Correct result (wrong score) | 1 |
| Incorrect | 0 |

### Odds Multiplier (1.00 – 2.00)

Calculated per match from prediction distribution: `2 - (predictions_for_outcome / total_predictions)`. Less popular correct predictions earn more.

### Team Multiplier

| Scenario | Multiplier |
|----------|-----------|
| No favorite/minnow in match | 1x |
| Favorite OR minnow in match | 2x |
| Both favorite AND minnow in match | 4x |

### Final Score

```
total = base_points × odds_multiplier × team_multiplier
```

### Knockout Penalty Rules

When you predict equal scores in a knockout match, you must also select which team wins on penalties. You only get points if both the score AND the penalty winner are correct.

## Database

SQLite is used everywhere. The database file location is controlled by `DATABASE_URL`:

- Local: `file:./data/predictor.db` (in project folder)
- AWS: `file:/home/ec2-user/app/data/predictor.db`
- Railway/Render: `file:/data/predictor.db` (persistent volume)

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
| Team multiplier | 4 | No match (1x), one team (2x), both teams (4x) |
| Knockout penalties | 5 | Penalty winner correctness, exact score with penalties |
| Score validation | 3 | Integer 0-20 accepted, everything else rejected |
| Deadlines | 6 | Group, knockout, team selection — all 2h before kickoff |
| Prediction persistence | 2 | Last-write-wins semantics |
| Penalty winner validation | 3 | Required when equal scores, null when unequal |
| Leaderboard ordering | 4 | Points desc → exact scores desc → name asc |
| Timezone conversion | 2 | Three timezone outputs represent same instant |
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
│   │   ├── layout.tsx            # Nav (Predict|Teams|Leaderboard|Admin), player switcher
│   │   ├── page.tsx              # Redirects to /predict
│   │   ├── predict/              # Batch prediction page (primary view)
│   │   │   ├── page.tsx          # Server component with filters
│   │   │   └── batch-prediction-form.tsx  # Client component with inline inputs
│   │   ├── matches/[matchId]/    # Match detail (results + scores)
│   │   ├── teams/                # Favorite/minnow selection
│   │   ├── leaderboard/          # Leaderboard
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
