# Implementation Plan: World Cup Predictor

## Overview

Implement a full-stack World Cup predictor game using Next.js, TypeScript, Prisma ORM, and SQLite. The application supports multiple independent groups on a single deployment, identified by a URL path slug (e.g., `/friends1/`, `/work-buddies/`). Each group has its own players, predictions, scores, and leaderboard. The implementation follows an incremental approach: project setup and data layer first, then group isolation, core scoring logic, predictions, team selections, leaderboard, match schedule UI, authentication, and finally local test mode. Each step builds on the previous and integrates fully before moving to the next.

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
    - Create `src/lib/utils/timezone.ts` for converting UTC to Eastern, UK, and IST
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
  - [x] 8.1 Implement authentication service with provider switching
    - Create `src/lib/auth/auth-service.ts` with provider factory pattern
    - Implement SSO provider (`src/lib/auth/sso-provider.ts`): OAuth2 flow with HERE SSO (redirect + callback)
    - Implement email provider (`src/lib/auth/email-provider.ts`): magic link generation, single-use token, 15-minute expiry
    - Implement session management: create session (7-day duration), validate session, logout
    - Sessions include `groupId` and `groupSlug` — player is authenticated within a specific group context
    - Enforce max 50 players per group (not globally)
    - Same email can register in multiple groups independently
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.2, 15.4_

  - [x] 8.2 Implement auth middleware for Next.js
    - Create `src/middleware.ts` for session validation on protected routes
    - Create auth API routes: `/api/[groupSlug]/auth/login`, `/api/[groupSlug]/auth/callback`, `/api/[groupSlug]/auth/verify`, `/api/[groupSlug]/auth/logout`
    - Validate that the session's group matches the URL group slug (prevent cross-group access)
    - Handle session expiry with redirect to login
    - _Requirements: 1.4, 1.6, 15.2_

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
    - Create batch prediction page (`/[groupSlug]/predict`) as the primary view with inline score inputs for all matches, "All" filter as default, stage/round filter tabs, "Save All Predictions" button, and missing prediction highlighting
    - Create batch prediction client component with inline score inputs, penalty winner toggle for knockout draws, change tracking, and batch submit
    - Create match detail page (`/[groupSlug]/matches/[matchId]`) showing all predictions and scores after deadline (linked from completed matches)
    - Create team selection page (`/[groupSlug]/teams`) for favorite/minnow selection
    - Create leaderboard page (`/[groupSlug]/leaderboard`) with ranked table (group-scoped)
    - Navigation: WCP 2026 | Predict | Teams | Leaderboard | Admin (test mode only)
    - _Requirements: 2.1, 4.2, 4.3, 6.1, 7.1, 8.4, 8.5, 9.1, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5, 15.1, 15.2, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 9.4 Implement admin page
    - Create admin page at `/[groupSlug]/admin` with admin-only access check
    - Display all matches with inline score input fields for batch result entry, with "Save All Results" button
    - For knockout matches with equal scores, show inline penalty winner toggle buttons
    - Create "Assign Knockout Teams" tab showing unassigned knockout slots with team dropdowns and "Assign All Teams" button
    - Both sections support batch operations — enter multiple results or assignments and submit once
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
