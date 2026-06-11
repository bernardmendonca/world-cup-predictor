# Implementation Plan: World Cup Predictor

## Overview

Implement a full-stack World Cup predictor game using Next.js, TypeScript, Prisma ORM, and PostgreSQL (Railway) / SQLite (local dev). The application supports multiple independent groups on a single deployment, identified by a URL path slug (e.g., `/friends1/`, `/work-buddies/`). Each group has its own players, predictions, scores, and leaderboard. Authentication is handled via unique invite links — admins create players and share personalized URLs. The implementation follows an incremental approach: project setup and data layer first, then group isolation, core scoring logic, predictions, team selections, leaderboard, match schedule UI, authentication, and finally local test mode. Each step builds on the previous and integrates fully before moving to the next.

## Tasks

- [x] 1. Project setup and data layer
  - [x] 1.1 Initialize Next.js project with TypeScript, Prisma, and SQLite
    - Run `npx create-next-app` with TypeScript template
    - Install dependencies: prisma, @prisma/client, fast-check (dev)
    - Configure `tsconfig.json` for strict mode
    - Create environment configuration module reading from `.env` (AUTH_PROVIDER, DATABASE_URL, DEPLOYMENT_MODE, ADMIN_EMAILS, etc.)
    - Create `.env.example` with all supported variables documented
    - _Requirements: 12.6, 12.7_

  - [x] 1.2 Define Prisma schema and seed data
    - Create `prisma/schema.prisma` with all models: Group, Player, Session, Team, Match, GroupPrediction, KnockoutPrediction, MatchScore
    - Add Group model with `id`, `slug` (unique, URL-safe), `name`, `createdAt`
    - Add `groupId` foreign key to Player model with unique constraint on `[groupId, email]`
    - Add `penaltyWinner` field to Match model (for knockout results decided by penalties)
    - Add KnockoutPrediction model with `homeScore`, `awayScore`, `penaltyWinner` fields
    - Create seed script (`prisma/seed.ts`) that populates all 48 teams (FIFA codes, groups) and the full World Cup 2026 match schedule (group stage matches with teams assigned; knockout match slots with null teams and slot labels like "1st Group A vs 2nd Group B")
    - Run initial migration to generate SQLite database at `./data/predictor.db`
    - _Requirements: 12.5, 14.3, 15.1_

  - [x] 1.3 Create shared TypeScript interfaces and types
    - Define all interfaces from the design: Group, AuthConfig, Session, Match, GroupPrediction, KnockoutPrediction, MatchScoreResult, LeaderboardEntry, TeamSelections, TimeZoneDisplay, OddsMultipliers
    - Define enums/union types: KnockoutRound, MatchStatus, DeploymentMode, AuthProvider
    - Place in `src/lib/types.ts`
    - _Requirements: 12.6, 15.1_

  - [x] 1.4 Implement group isolation module
    - Create `src/lib/groups/group-service.ts`
    - Implement `resolveGroup(slug)`: look up group by slug, create on-demand if not found
    - Implement slug validation: lowercase alphanumeric + hyphens, 3-30 characters
    - Create `src/lib/groups/group-middleware.ts`: extract group slug from URL path, resolve group, attach to request context
    - All downstream services receive `groupId` to scope queries
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 2. Scoring engine implementation
  - [x] 2.1 Implement base points calculation
    - Create `src/lib/scoring/base-points.ts`
    - Implement logic: exact score match → 4 pts, correct result only → 1 pt, incorrect → 0 pts
    - Handle edge cases: draws, high scores, zero-zero
    - _Requirements: 3.1, 3.2, 3.3_

  - [x]* 2.2 Write property test for base points calculation
    - **Property 2: Base points calculation**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 2.3 Implement odds multiplier calculation
    - Create `src/lib/scoring/odds-multiplier.ts`
    - Implement formula: `2 - (predictionsForOutcome / totalPredictions)`, rounded to 2dp
    - Handle edge cases: zero predictions for an outcome → multiplier 0, single prediction → 1.00, unanimous → 1.00
    - Ensure all non-zero multipliers fall within [1.00, 2.00]
    - Odds multiplier is calculated only from predictions within the same group (group-scoped)
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7, 15.3_

  - [x]* 2.4 Write property test for odds multiplier calculation
    - **Property 3: Odds multiplier calculation**
    - **Validates: Requirements 8.2, 8.3, 8.6, 8.7**

  - [x] 2.5 Implement team multiplier calculation
    - Create `src/lib/scoring/team-multiplier.ts`
    - Implement logic: no team match → 1, one team matches favorite XOR minnow → 2, same team is both → 4, both teams in match are favorite and minnow → 4
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x]* 2.6 Write property test for team multiplier calculation
    - **Property 4: Team multiplier calculation**
    - **Validates: Requirements 13.2, 13.3, 13.4, 13.5, 13.6, 6.5, 7.5, 7.7**

  - [x] 2.7 Implement total scoring formula and match scoring service
    - Create `src/lib/scoring/scoring-service.ts`
    - Implement `calculateMatchScores(groupId, matchId, homeScore, awayScore, penaltyWinner?)`: fetches all predictions for the group, computes base points, odds multipliers, team multipliers, and final total = `round(base × odds × team, 2)`
    - For knockout matches decided by penalties: correct result requires predicting equal scores AND correct penalty winner; correct exact score requires exact drawn scoreline AND correct penalty winner
    - Store results in MatchScore table
    - Works for both group stage and knockout stage matches (same formula)
    - Scoring is scoped to players within the specified group
    - _Requirements: 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 13.1, 15.3_

  - [x]* 2.8 Write property test for scoring formula correctness
    - **Property 1: Scoring formula correctness**
    - **Validates: Requirements 3.4, 13.1**

  - [x] 2.9 Implement knockout penalty scoring logic
    - Create `src/lib/scoring/knockout-penalty-scoring.ts`
    - Implement logic for determining correct result and correct exact score when a knockout match ends in a draw (penalties)
    - A prediction of equal scores with the correct penalty winner = correct result (1 base point)
    - A prediction of the exact drawn scoreline with the correct penalty winner = correct exact score (4 base points)
    - A prediction of equal scores with the wrong penalty winner = incorrect (0 points)
    - _Requirements: 5.4, 5.5_

  - [x]* 2.10 Write property test for knockout stage scoring with penalties
    - **Property 5: Knockout stage scoring with penalties**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [x] 3. Checkpoint - Scoring engine
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Prediction and deadline logic
  - [x] 4.1 Implement group stage prediction service
    - Create `src/lib/predictions/group-predictions.ts`
    - Implement submit/update prediction with validation (integer scores 0-20)
    - Implement deadline check: reject if current time ≥ kickoff - 2 hours
    - Implement upsert logic (create or update existing prediction)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 4.2 Write property test for score input validation
    - **Property 14: Score input validation**
    - **Validates: Requirements 2.7**

  - [x]* 4.3 Write property test for group prediction deadline enforcement
    - **Property 6: Group prediction deadline enforcement**
    - **Validates: Requirements 2.4, 2.5**

  - [x]* 4.4 Write property test for prediction persistence round-trip
    - **Property 9: Prediction persistence round-trip**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 4.5 Implement knockout stage prediction service
    - Create `src/lib/predictions/knockout-predictions.ts`
    - Implement submit/update score prediction with validation (integer scores 0-20)
    - Implement penalty winner validation: required when homeScore === awayScore, must be 'home' or 'away'; rejected/cleared when scores are unequal
    - Implement deadline check: reject if current time ≥ kickoff - 2 hours (same as group stage)
    - Only allow predictions for knockout matches where both teams are confirmed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x]* 4.6 Write property test for knockout prediction deadline enforcement
    - **Property 7: Knockout prediction deadline enforcement**
    - **Validates: Requirements 4.6, 4.7**

  - [x]* 4.6a Write property test for knockout penalty winner validation
    - **Property 16: Knockout penalty winner validation**
    - **Validates: Requirements 4.3, 4.4, 4.5**

  - [x] 4.7 Implement team selection service
    - Create `src/lib/predictions/team-selection.ts`
    - Implement favorite and minnow team selection with deadline enforcement (2 hours before first match)
    - Enforce single selection constraint (most recent selection wins)
    - Allow same team for both favorite and minnow
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.7_

  - [x]* 4.8 Write property test for team selection deadline enforcement
    - **Property 8: Team selection deadline enforcement**
    - **Validates: Requirements 6.2, 6.3, 7.2, 7.3**

  - [x]* 4.9 Write property test for single team selection constraint
    - **Property 15: Single team selection constraint**
    - **Validates: Requirements 6.1, 7.1**

- [x] 5. Checkpoint - Predictions and deadlines
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Leaderboard and match schedule
  - [x] 6.1 Implement leaderboard service
    - Create `src/lib/leaderboard/leaderboard-service.ts`
    - Implement `getLeaderboard(groupId)`: aggregate total points from MatchScore table (covers both group and knockout stages) for players in the specified group only
    - Implement ordering: total points desc → exact scores desc → alphabetical name
    - Return ranked LeaderboardEntry array
    - _Requirements: 9.1, 9.3, 9.4, 15.3_

  - [x]* 6.2 Write property test for leaderboard ordering
    - **Property 10: Leaderboard ordering**
    - **Validates: Requirements 9.1, 9.4**

  - [x] 6.3 Implement match schedule service and time zone display
    - Create `src/lib/matches/match-service.ts`
    - Implement `getAllMatches()`, `getMatch()`, `getMatchesByStage()`, `recordResult(matchId, homeScore, awayScore, penaltyWinner?)`
    - For knockout matches: `penaltyWinner` is required when homeScore === awayScore
    - Create `src/lib/utils/timezone.ts` for converting UTC to Eastern, UK, IST, and AEST
    - Implement match status derivation: completed (has result), in_progress (past kickoff, no result), upcoming (before kickoff)
    - Implement prediction deadline derivation: kickoff - 2 hours
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x]* 6.4 Write property test for time zone conversion
    - **Property 11: Time zone conversion**
    - **Validates: Requirements 10.1**

  - [x]* 6.5 Write property test for prediction deadline derivation
    - **Property 12: Prediction deadline derivation**
    - **Validates: Requirements 10.3**

  - [x]* 6.6 Write property test for match status derivation
    - **Property 13: Match status derivation**
    - **Validates: Requirements 10.5**

- [x] 7. Checkpoint - Leaderboard and schedule
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Authentication module
  - [x] 8.1 Implement invite link authentication
    - Add `inviteToken` field (unique, auto-generated) to Player model
    - Create `/{groupSlug}/join/[token]` page route that validates the token, creates a 60-day session, sets cookie, and redirects to predict page
    - Update middleware to allow `/join/` routes without authentication
    - Update middleware to allow `?adminKey=ADMIN_SECRET` bootstrap access
    - Sessions include `groupId` and `groupSlug` — player is authenticated within a specific group context
    - Same email can exist in multiple groups independently
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 15.2, 15.4_

  - [x] 8.2 Implement admin player management
    - Create `/api/[groupSlug]/admin/players` API route (GET: list players, POST: create player)
    - Support auth via session (admin email check) or `ADMIN_SECRET` header for bootstrap
    - Auto-generate `inviteToken` on player creation
    - Create `PlayerManagement` client component with create form and player list with "Copy Invite Link" buttons
    - Add "Players" tab as default section in admin page
    - _Requirements: 1.6, 16.3, 16.4_

  - [x] 8.3 Implement auth middleware for Next.js
    - Create `src/middleware.ts` for session validation on protected routes
    - Allow `/join/` routes and `?adminKey=` bootstrap without session
    - Validate that the session's group matches the URL group slug (prevent cross-group access)
    - Handle session expiry with redirect to login
    - Show Admin link in nav for admin users (not just test mode)
    - _Requirements: 1.5, 15.2_

- [x] 9. API routes and pages
  - [x] 9.1 Implement prediction API routes
    - Create `/api/[groupSlug]/predictions/group` (POST/GET) for group stage predictions
    - Create `/api/[groupSlug]/predictions/knockout` (POST/GET) for knockout stage score predictions (includes penaltyWinner field)
    - Create `/api/[groupSlug]/teams/selection` (POST/GET) for favorite/minnow team selection
    - All routes resolve group from slug and scope data access to that group
    - Add input validation, deadline checks, penalty winner validation, and error responses
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 6.4, 7.4, 15.2_

  - [x] 9.2 Implement admin API routes and service
    - Create `src/lib/admin/admin-service.ts` with `isAdmin(email)` check against `ADMIN_EMAILS` env var
    - Create `/api/[groupSlug]/admin/results` (POST) for recording match results (homeScore, awayScore, penaltyWinner)
    - Create `/api/[groupSlug]/admin/knockout/assign` (POST) for assigning teams to knockout match slots
    - Create `/api/[groupSlug]/admin/bracket-status` (GET) for knockout bracket progression status
    - Trigger score calculation scoped to the group on result submission
    - Implement idempotent result recording (recalculate and overwrite on duplicate)
    - Validate admin access on all admin routes (reject non-admin with 403)
    - _Requirements: 3.4, 5.7, 9.2, 14.5, 16.1, 16.2, 16.4, 16.5, 16.6_

  - [x] 9.3 Implement server-rendered pages
    - Create landing page (`/`) showing a group selector or list of groups, with option to enter a group slug
    - Create group dashboard (`/[groupSlug]`) that redirects to the predict page
    - Create batch prediction page (`/[groupSlug]/predict`) as the primary view with team selection section at the top (favorite/minnow), inline score inputs for all matches, "All" filter as default, stage/round filter tabs, "Save All Predictions" button, missing prediction highlighting, and the logged-in player's scoring breakdown shown inline for completed matches
    - Create batch prediction client component with inline score inputs, penalty winner toggle for knockout draws, change tracking, per-match player score display, and batch submit
    - Create team selection section on predict page showing favorite/minnow selections with edit capability when open, read-only display when closed
    - Create match detail page (`/[groupSlug]/matches/[matchId]`) as an informational view showing predictions and odds after deadline, plus a comparison table with scores for completed matches (linked from locked matches only)
    - Create team selection page (`/[groupSlug]/teams`) for favorite/minnow selection (legacy, still accessible)
    - Create leaderboard page (`/[groupSlug]/leaderboard`) with ranked table (group-scoped)
    - Navigation: WCP 2026 | Predict | Teams | Leaderboard | Admin (test mode only)
    - _Requirements: 2.1, 4.2, 4.3, 6.1, 6.7, 6.8, 7.1, 7.8, 7.9, 8.4, 8.5, 9.1, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 15.1, 15.2, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 9.4 Implement admin page
    - Create admin page at `/[groupSlug]/admin` with admin-only access check (or `?adminKey=` bootstrap)
    - Default to "Players" tab showing create player form + player list with copy invite link buttons
    - Display all matches with inline score input fields for batch result entry in "Record Results" tab, with "Save All Results" button
    - For knockout matches with equal scores, show inline penalty winner toggle buttons
    - Create "Assign Knockout Teams" tab showing unassigned knockout slots with team dropdowns and "Assign All Teams" button
    - All three sections support batch operations — enter multiple items and submit once
    - Green highlight on matches with recorded results, counter showing "X of Y results recorded"
    - Scores are calculated automatically when results are saved
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12_

- [x] 10. Local test mode
  - [x] 10.1 Implement test mode configuration and player switcher
    - Create `src/lib/test-mode/test-mode.ts` with environment detection
    - Bypass auth when `DEPLOYMENT_MODE=test`
    - Create a default test group (slug: "test-group") with 3 dummy players (Test Player 1, 2, 3) on startup
    - Add player switcher UI component visible only in test mode
    - _Requirements: 14.1, 14.2, 14.7, 15.1_

  - [x] 10.2 Implement time override and admin controls for test mode
    - Create time override mechanism (query param or UI control) to simulate deadlines
    - Create admin panel for recording match results manually
    - Display scoring breakdown per player per match (base, odds, team, total)
    - Pre-seed database with full match schedule on first run
    - _Requirements: 14.3, 14.4, 14.5, 14.6_

- [x] 11. Integration and wiring
  - [x] 11.1 Wire scoring engine to match result recording
    - Connect result recording API to scoring service (pass penaltyWinner for knockout matches)
    - Trigger leaderboard recalculation after scores are computed
    - Ensure knockout scoring correctly handles penalty results
    - _Requirements: 3.4, 5.7, 9.2_

  - [x] 11.2 Wire odds multiplier display and deadline UI
    - Hide odds multipliers before prediction deadline (show "Hidden until deadline")
    - Reveal odds multipliers after deadline passes
    - Show countdown timers for upcoming deadlines
    - _Requirements: 8.4, 8.5, 10.3_

  - [x] 11.3 Implement dark theme with toggle
    - Configure Tailwind CSS `darkMode: "class"` strategy
    - Create `ThemeProvider` client component managing `dark` class on `<html>` with localStorage persistence
    - Create `ThemeToggle` component (☀️/🌙) placed in navigation header and landing page
    - Default to dark theme on first visit
    - Add `dark:` variants to all pages: landing, predict, leaderboard, teams, matches, match detail, admin
    - _Requirements: 12.8_

  - [x]* 11.3 Write integration tests for end-to-end flows
    - Test full prediction → result → scoring → leaderboard flow within a single group
    - Test group isolation: predictions in group A do not affect odds/leaderboard in group B
    - Test deadline enforcement across API boundaries
    - Test both deployment mode configurations boot correctly
    - Test that the same email can register and play independently in two different groups
    - _Requirements: 12.5, 12.6, 15.2, 15.3_

  - [x]* 11.4 Write property test for group data isolation
    - **Property 17: Group data isolation**
    - **Validates: Requirements 1.3, 1.5, 8.2, 9.1, 15.1, 15.2, 15.3, 15.4**

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Railway deployment and PostgreSQL migration
  - [x] 13.1 Switch database from SQLite to PostgreSQL for production
    - Update `prisma/schema.prisma` datasource provider to `postgresql`
    - Generate PostgreSQL migration via `prisma migrate diff`
    - Add `migration_lock.toml` for PostgreSQL provider
    - Update README with deployment instructions
    - _Requirements: 12.3, 12.5_

  - [x] 13.2 Configure Railway deployment
    - Build command: `npx prisma generate && npm run build` (no DB connection needed)
    - Start command: `npx prisma migrate deploy && npm run start` (migrations run at runtime when internal Postgres is reachable)
    - Document all Railway environment variables
    - Seed database via Railway shell after first deploy
    - _Requirements: 12.3, 12.5_

  - [x] 13.3 Implement invite link authentication system
    - Add `inviteToken` field to Player model with unique constraint
    - Create `/{groupSlug}/join/[token]` route for token-based login
    - Create admin player management API (`/api/[groupSlug]/admin/players`)
    - Create `PlayerManagement` UI component with create form and copy link buttons
    - Update admin page with Players tab as default view
    - Update middleware for join routes and admin bootstrap
    - Update layout to show Admin link for admin users in non-test mode
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 16.3, 16.4_

  - [x] 13.4 Refactor team selection UX
    - Remove team selection forms from the Teams page (Teams page now shows read-only team list)
    - Sort team dropdowns by FIFA ranking, showing rank number in each option
    - Filter minnow team dropdown to only show teams with FIFA ranking ≥ 44 (14 teams)
    - Integrate team selection save into the "Save All Predictions" batch button (removed individual save buttons)
    - Highlight team selection section with amber border and info message when selections are missing
    - Create `PredictClient` wrapper component to share state between `TeamSelectionSection` and `BatchPredictionForm`
    - _Requirements: 6.7, 6.9, 6.10, 7.1, 7.8, 7.10, 7.11_

  - [x] 13.5 Refactor leaderboard with stage breakdown and sortable columns
    - Update leaderboard service to calculate group stage points and knockout points separately
    - Replace leaderboard page with columns: Rank, Player, Group, Knockout, Total
    - Create `LeaderboardTable` client component with click-to-sort on all columns
    - Default sort by total points descending, toggle asc/desc on click
    - Display sort indicator arrows on active column
    - Remove `correctPredictions` and `exactScores` columns
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

  - [x] 13.6 Dark mode fixes and predict page stage dividers
    - Fix admin page Record Results and Assign Knockout Teams sections: add dark mode variants to match rows, sticky bars, inputs, selects, and penalty buttons
    - Add stage/round dividers to the Predictions page match list: horizontal line with label between Group Stage, Round of 32, Round of 16, Quarter Finals, Semi Finals, Third Place, and Final
    - _Requirements: 12.8_

- [x] 14. Match Prediction Comparison Feature
  - [x] 14.1 Implement match list conditional clickability
    - Match rows on the matches list page are only clickable after the prediction deadline has passed
    - Rows for matches with open predictions are rendered as non-clickable static content with reduced opacity
    - _Requirements: 17.1, 17.2_

  - [x] 14.2 Implement match detail page two-state comparison view
    - Page is informational only — no submit/save actions (all predictions are made on the predict page)
    - State 1 (locked, not scored): show all group participants' predictions and odds multipliers
    - State 2 (completed): show unified "Predictions vs Result" comparison table with accuracy badges, points earned, and collapsible detailed breakdown
    - Players who didn't submit a prediction appear as "No prediction" with 0 points
    - Comparison sorted by accuracy (Exact → Result → Wrong → None), then by points descending
    - _Requirements: 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [x] 14.3 Implement admin prediction status visibility
    - Add inline prediction status chip to each match row on the Record Results tab showing predicted count vs total players
    - Green chip when all predicted (deadline open), amber when some missing, red when none predicted
    - Missing player names expanded by default when deadline is open and predictions are incomplete (screenshot-friendly)
    - Static gray chip with count only when deadline has passed (not actionable)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 14.4 Fix prediction visibility after deadline on batch predict page
    - Show participant's saved prediction as disabled (read-only) inputs after the deadline passes instead of "Closed" text
    - Display actual match result as a separate "Result: X - Y" line for completed matches
    - Preserve time override param in match detail links for test mode navigation
    - Add `force-dynamic` to matches list page to prevent stale caching of deadline checks
    - _Requirements: 2.6, 4.8_

- [x] 15. Mobile responsive design
  - [x] 15.1 Add mobile navigation menu
    - Create `src/app/[groupSlug]/mobile-nav.tsx` client component with hamburger icon and dropdown menu
    - Visible only below sm breakpoint (640px) via `sm:hidden`
    - Includes all nav links (Predict, Teams, Leaderboard, Admin)
    - Desktop nav links remain via `hidden sm:flex`
    - Nav container set to `relative` for dropdown positioning
    - Player name hidden on mobile with `hidden sm:inline`
    - _Requirements: 12.1_

  - [x] 15.2 Fix responsive layout issues across pages
    - Add `flex-wrap` to matches page filter buttons (already present on predict/admin pages)
    - Make team name widths responsive: `w-[100px] sm:w-[120px]` in batch prediction form
    - Hide secondary timezones (IST, AEST) on mobile via `hidden sm:inline` on matches and match detail pages
    - Add `flex-wrap` to timezone rows to prevent overflow
    - _Requirements: 12.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The scoring engine is implemented first because it has no UI dependencies and is the most logic-dense component
- All time-related logic uses a `getCurrentTime()` utility that can be overridden in test mode

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.3", "2.5"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.7"] },
    { "id": 4, "tasks": ["2.8", "2.9"] },
    { "id": 5, "tasks": ["2.10", "4.1", "4.5", "4.7"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "4.6", "4.6a", "4.8", "4.9"] },
    { "id": 7, "tasks": ["6.1", "6.3"] },
    { "id": 8, "tasks": ["6.2", "6.4", "6.5", "6.6"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2", "9.1", "9.2"] },
    { "id": 11, "tasks": ["9.3", "9.4"] },
    { "id": 12, "tasks": ["10.1", "10.2"] },
    { "id": 13, "tasks": ["11.1", "11.2"] },
    { "id": 14, "tasks": ["11.3", "11.4"] }
  ]
}
```
