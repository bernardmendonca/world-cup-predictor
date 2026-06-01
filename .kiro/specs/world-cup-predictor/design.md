# Design Document

## Overview

The World Cup Predictor is a full-stack web application for small groups (20-50 players) to compete by predicting match outcomes during the FIFA World Cup. The system supports two deployment modes from a single codebase: an internal AWS deployment with HERE SSO authentication, and an external low-cost deployment with email-based magic link authentication.

A single deployed instance supports multiple independent groups, each identified by a URL path slug (e.g., `/friends1/`, `/work-buddies/`). Each group has its own players, predictions, scores, and leaderboard, completely isolated from other groups. This allows one deployment to serve several friend circles or teams without interference.

The application consists of:
- A server-side rendered web application with a lightweight frontend
- A relational database for persistent storage
- An authentication layer that switches between SSO and email verification based on environment configuration
- A scoring engine that calculates points using base scores, odds multipliers, and team multipliers
- A group isolation layer that scopes all data by a URL-based group slug

### Key Design Decisions

1. **Next.js with TypeScript** — Provides server-side rendering, API routes, and a single deployable artifact. Well-suited for both AWS (single EC2 instance) and low-cost platforms (Railway, Render, Fly.io).
2. **SQLite everywhere** — SQLite is used as the sole database across all environments (local, internal AWS, and external). It's a single file, requires no separate database server, and works identically across all environments. Only the file path changes via the `DATABASE_URL` environment variable (e.g., `file:./data/predictor.db` locally, `file:/home/ec2-user/app/data/predictor.db` on AWS, `file:/data/predictor.db` on Railway). This eliminates database configuration drift between environments and simplifies deployment.
3. **Server-side rendering with minimal client JS** — The app is read-heavy with simple forms. SSR reduces complexity and improves performance for the 20-50 user scale.
4. **Environment-based configuration** — A single `.env` file controls deployment mode, auth provider, database URL, and feature flags.
5. **Single-instance constraint** — SQLite requires a single server instance (not serverless or multi-instance) to avoid write contention. This is perfectly adequate for 20-50 concurrent users and simplifies the deployment topology.
6. **URL-based multi-group isolation** — All routes are prefixed with a group slug (e.g., `/friends1/leaderboard`, `/work-buddies/predict/knockout`). The group slug is a dynamic Next.js route segment (`/[groupSlug]/...`). All data (players, predictions, scores, leaderboard) is scoped to the group. This allows a single deployment to serve multiple independent friend groups without any data leakage between them. Groups are created on-demand when the first player registers under a given slug. The 50-player limit applies per group, not globally.

## Architecture

```mermaid
graph TB
    subgraph Client
        Browser[Browser - Chrome/Firefox/Safari/Edge]
    end

    subgraph Application["Next.js Application"]
        Pages["Pages / SSR (/[groupSlug]/...)"]
        API["API Routes (/api/[groupSlug]/...)"]
        Auth[Auth Middleware]
        GroupResolver[Group Resolver Middleware]
        Scoring[Scoring Engine]
    end

    subgraph AuthProviders["Auth Providers"]
        SSO[HERE SSO - Internal]
        Email[Email Magic Link - External]
    end

    subgraph DataLayer["Data Layer"]
        Prisma[Prisma ORM]
        SQLite[SQLite File]
    end

    Browser --> Pages
    Browser --> API
    Pages --> GroupResolver
    API --> GroupResolver
    GroupResolver --> Auth
    Auth --> SSO
    Auth --> Email
    API --> Scoring
    Scoring --> Prisma
    Pages --> Prisma
    Prisma --> SQLite
```

### Deployment Architecture

```mermaid
graph LR
    subgraph Internal["Internal Deployment (AWS)"]
        EC2[EC2 Instance - t3.micro]
        EBS[EBS Volume - SQLite File]
        SES[SES for emails]
        EC2 --> EBS
    end

    subgraph External["External Deployment"]
        Platform[Railway / Render / Fly.io]
        PersistentDisk[Persistent Disk Volume - SQLite File]
        Resend[Resend - Free Tier Email]
        Platform --> PersistentDisk
    end

    subgraph Local["Local Development"]
        DevServer[Next.js Dev Server]
        LocalDB[SQLite File - ./data/predictor.db]
    end
```

**Deployment details:**
- **Local**: SQLite file stored in the project folder at `./data/predictor.db`. Zero configuration needed.
- **Internal (AWS)**: Single EC2 instance (t3.micro is sufficient for 50 users) running the Next.js app directly with the SQLite file on the instance's EBS volume at `/home/ec2-user/app/data/predictor.db`. Use PM2 or systemd to keep the process running. No load balancer, no containers, no EFS — just SSH in, deploy, and run.
- **External**: Railway, Render, or Fly.io with a persistent disk volume for the `.db` file at `/data/predictor.db`. These platforms support persistent filesystem storage, unlike serverless platforms.

## Components and Interfaces

### 0. Group Isolation Module

Resolves the group from the URL slug and scopes all data access to that group. Groups are created on-demand.

```typescript
interface GroupService {
  resolveGroup(slug: string): Promise<Group>;
  getGroup(groupId: string): Promise<Group | null>;
  getGroupBySlug(slug: string): Promise<Group | null>;
}

interface Group {
  id: string;
  slug: string;        // URL-safe identifier, e.g., "friends1", "work-buddies"
  name: string;        // Display name, defaults to slug
  createdAt: Date;
}
```

**Routing structure:**
- All pages live under `/[groupSlug]/...` (e.g., `/friends1/leaderboard`, `/friends1/predict/knockout`)
- All API routes live under `/api/[groupSlug]/...` (e.g., `/api/friends1/predictions/group`)
- The root `/` page shows a simple landing/group selector or redirects to a default group
- Group slugs are validated: lowercase alphanumeric + hyphens, 3-30 characters

### 1. Authentication Module

Handles player registration and session management with provider switching. Players are scoped to a group — the same email can register in multiple groups independently.

```typescript
interface AuthConfig {
  provider: 'sso' | 'email';
  ssoClientId?: string;
  ssoClientSecret?: string;
  ssoIssuerUrl?: string;
  emailFromAddress?: string;
  emailServiceApiKey?: string;
  sessionDurationDays: number; // default: 7
  maxPlayersPerGroup: number;  // default: 50
}

interface AuthService {
  initiateLogin(groupId: string, email: string): Promise<LoginResult>;
  verifyCallback(token: string): Promise<Session>;
  getSession(sessionToken: string): Promise<Session | null>;
  logout(sessionToken: string): Promise<void>;
}

interface Session {
  id: string;
  playerId: string;
  playerName: string;
  groupId: string;
  groupSlug: string;
  expiresAt: Date;
}

interface LoginResult {
  type: 'redirect' | 'email_sent';
  redirectUrl?: string;
  message?: string;
}
```

### 2. Prediction Module

Manages score predictions for both group stage and knockout stage matches. Knockout predictions include a penalty winner field for drawn scores.

```typescript
interface PredictionService {
  // Group Stage
  submitGroupPrediction(playerId: string, matchId: string, homeScore: number, awayScore: number): Promise<PredictionResult>;
  getGroupPrediction(playerId: string, matchId: string): Promise<GroupPrediction | null>;
  getGroupPredictionsForMatch(matchId: string): Promise<GroupPrediction[]>;

  // Knockout Stage
  submitKnockoutPrediction(playerId: string, matchId: string, homeScore: number, awayScore: number, penaltyWinner?: 'home' | 'away'): Promise<PredictionResult>;
  getKnockoutPrediction(playerId: string, matchId: string): Promise<KnockoutPrediction | null>;
  getKnockoutPredictionsForMatch(matchId: string): Promise<KnockoutPrediction[]>;

  // Deadlines
  isPredictionOpen(matchId: string): boolean; // works for both stages
}

interface GroupPrediction {
  id: string;
  playerId: string;
  matchId: string;
  homeScore: number; // 0-20 integer
  awayScore: number; // 0-20 integer
  submittedAt: Date;
  updatedAt: Date;
}

interface KnockoutPrediction {
  id: string;
  playerId: string;
  matchId: string;
  homeScore: number;        // 0-20 integer
  awayScore: number;        // 0-20 integer
  penaltyWinner: 'home' | 'away' | null;  // required when homeScore === awayScore, null otherwise
  submittedAt: Date;
  updatedAt: Date;
}

interface PredictionResult {
  success: boolean;
  message: string;
  prediction?: GroupPrediction | KnockoutPrediction;
}
```

### 3. Scoring Engine

Calculates points based on match results, odds multipliers, and team multipliers. The same scoring formula applies to both group and knockout stages. For knockout matches decided by penalties, the penalty winner prediction is factored into correctness.

```typescript
interface ScoringService {
  calculateMatchScores(groupId: string, matchId: string, actualHomeScore: number, actualAwayScore: number, penaltyWinner?: 'home' | 'away'): Promise<MatchScoreResult[]>;
  getOddsMultipliers(groupId: string, matchId: string): OddsMultipliers;
  getPlayerTotalScore(playerId: string): Promise<number>;
}

interface MatchScoreResult {
  playerId: string;
  matchId: string;
  basePoints: number;         // 0, 1, or 4
  oddsMultiplier: number;     // 1.00 - 2.00
  teamMultiplier: number;     // 1, 2, or 4
  totalPoints: number;        // base × odds × team, rounded to 2dp
  correctResult: boolean;
  correctExactScore: boolean;
}

interface OddsMultipliers {
  homeWin: number;
  awayWin: number;
  draw: number;  // in knockout: "draw" means equal scores (decided by penalties)
}
```

**Knockout scoring details:**
- For knockout matches where the actual result is a draw (penalties), the "correct result" means predicting equal scores AND correctly picking the penalty winner.
- A player who predicts equal scores but picks the wrong penalty winner gets 0 points (wrong result).
- A player who predicts the exact drawn scoreline AND the correct penalty winner gets 4 base points.
- The odds multiplier for knockout matches uses the same formula as group stage, with three outcomes: home win, away win, draw (penalties). The "draw" outcome in knockout context means "match goes to penalties".

### 4. Team Selection Module

Manages favorite and minnow team selections with deadline enforcement.

```typescript
interface TeamSelectionService {
  selectFavoriteTeam(playerId: string, teamId: string): Promise<SelectionResult>;
  selectMinnowTeam(playerId: string, teamId: string): Promise<SelectionResult>;
  getPlayerSelections(playerId: string): Promise<TeamSelections>;
  getTeamMultiplier(playerId: string, matchId: string): number;
  isSelectionOpen(): boolean;
}

interface TeamSelections {
  favoriteTeamId: string | null;
  minnowTeamId: string | null;
}

interface SelectionResult {
  success: boolean;
  message: string;
}
```

### 5. Leaderboard Module

Aggregates scores and provides ranked player standings, scoped to a group.

```typescript
interface LeaderboardService {
  getLeaderboard(groupId: string): Promise<LeaderboardEntry[]>;
  getPlayerRank(groupId: string, playerId: string): Promise<number>;
}

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalPoints: number;
  correctPredictions: number;  // count of predictions earning points
  exactScores: number;         // count of correct exact scores (tiebreaker)
}
```

### 6. Match Schedule Module

Manages the tournament schedule, match statuses, and time zone display.

```typescript
interface MatchService {
  getAllMatches(): Promise<Match[]>;
  getMatch(matchId: string): Promise<Match | null>;
  getMatchesByStage(stage: 'group' | 'knockout'): Promise<Match[]>;
  getMatchesByRound(round: KnockoutRound): Promise<Match[]>;
  recordResult(matchId: string, homeScore: number, awayScore: number, penaltyWinner?: 'home' | 'away'): Promise<void>;
  assignKnockoutTeams(matchId: string, homeTeamId: string, awayTeamId: string): Promise<void>;
  isMatchReadyForPredictions(matchId: string): boolean; // true if both teams confirmed
}

interface Match {
  id: string;
  homeTeam: Team | null;       // null for knockout matches where team is TBD
  awayTeam: Team | null;       // null for knockout matches where team is TBD
  group?: string;              // e.g., "A", "B" — null for knockout
  stage: 'group' | 'knockout';
  knockoutRound?: KnockoutRound;
  venue: string;
  kickoffTime: Date;           // stored as UTC
  predictionDeadline: Date;    // kickoffTime - 2 hours
  status: 'upcoming' | 'in_progress' | 'completed';
  homeScore?: number;
  awayScore?: number;
  penaltyWinner?: 'home' | 'away';  // only for knockout matches decided by penalties
}

type KnockoutRound = 'round_of_32' | 'round_of_16' | 'quarter_finals' | 'semi_finals' | 'third_place' | 'final';
```

### 7. Admin Module

Provides admin-only functionality for recording match results and managing knockout bracket progression. Admin access is determined by the `ADMIN_EMAILS` environment variable.

```typescript
interface AdminService {
  isAdmin(email: string): boolean;

  // Match result recording
  recordMatchResult(groupId: string, matchId: string, homeScore: number, awayScore: number, penaltyWinner?: 'home' | 'away'): Promise<AdminResultResponse>;

  // Knockout bracket management
  getKnockoutBracketStatus(): Promise<BracketStatus>;
  assignTeamsToKnockoutMatch(matchId: string, homeTeamId: string, awayTeamId: string): Promise<void>;
  getPendingKnockoutAssignments(): Promise<PendingAssignment[]>;
}

interface AdminResultResponse {
  success: boolean;
  matchId: string;
  playersScored: number;       // how many players earned points
  averagePoints: number;       // average points awarded
  leaderboardUpdated: boolean;
}

interface BracketStatus {
  rounds: {
    round: KnockoutRound;
    totalMatches: number;
    teamsAssigned: number;      // matches with both teams confirmed
    resultsRecorded: number;    // matches with final scores
    readyForNextRound: boolean; // all matches in this round have results
  }[];
}

interface PendingAssignment {
  matchId: string;
  knockoutRound: KnockoutRound;
  homeTeamSlot: string;        // description like "Winner of Match 49" or "1st Group A"
  awayTeamSlot: string;
  homeTeamId: string | null;   // null if not yet assigned
  awayTeamId: string | null;
}
```

**Admin workflow:**
1. Group stage matches complete → admin enters scores inline for all completed matches on the admin page, clicks "Save All Results" to batch-process them
2. Once all 6 matches in a group are done, the admin switches to the "Assign Knockout Teams" tab and assigns teams to R32 slots in batch
3. Once all R32 matches have results, admin assigns R16 teams, and so on through the bracket
4. At each step, the system shows what's pending and what's ready for assignment
5. Both result recording and team assignment support batch operations with a single submit button

interface Team {
  id: string;
  name: string;
  code: string;   // FIFA 3-letter code
  group: string;
}

// Time zone display helper
interface TimeZoneDisplay {
  eastern: string;  // US Eastern (ET)
  uk: string;       // UK (GMT/BST)
  ist: string;      // India Standard Time
}
```

## Data Models

```mermaid
erDiagram
    Group {
        string id PK
        string slug UK
        string name
        datetime createdAt
    }

    Player {
        string id PK
        string groupId FK
        string name
        string email
        string favoriteTeamId FK
        string minnowTeamId FK
        datetime createdAt
    }

    Session {
        string id PK
        string playerId FK
        string token UK
        datetime expiresAt
        datetime createdAt
    }

    Team {
        string id PK
        string name
        string code
        string group
    }

    Match {
        string id PK
        string homeTeamId FK "nullable for knockout TBD"
        string awayTeamId FK "nullable for knockout TBD"
        string group
        string stage
        string knockoutRound
        string venue
        datetime kickoffTime
        string status
        int homeScore
        int awayScore
        string penaltyWinner
        string homeSlotLabel
        string awaySlotLabel
    }

    GroupPrediction {
        string id PK
        string playerId FK
        string matchId FK
        int homeScore
        int awayScore
        datetime submittedAt
        datetime updatedAt
    }

    KnockoutPrediction {
        string id PK
        string playerId FK
        string matchId FK
        int homeScore
        int awayScore
        string penaltyWinner
        datetime submittedAt
        datetime updatedAt
    }

    MatchScore {
        string id PK
        string playerId FK
        string matchId FK
        int basePoints
        float oddsMultiplier
        int teamMultiplier
        float totalPoints
        boolean correctResult
        boolean correctExactScore
    }

    Group ||--o{ Player : contains
    Player ||--o{ Session : has
    Player ||--o{ GroupPrediction : makes
    Player ||--o{ KnockoutPrediction : makes
    Player ||--o{ MatchScore : earns
    Player }o--o| Team : favoriteTeam
    Player }o--o| Team : minnowTeam
    Match ||--o{ GroupPrediction : receives
    Match ||--o{ KnockoutPrediction : receives
    Match ||--o{ MatchScore : produces
    Team ||--o{ Match : playsHome
    Team ||--o{ Match : playsAway
```

### Prisma Schema (Key Models)

```prisma
model Group {
  id        String   @id @default(cuid())
  slug      String   @unique  // URL path segment, e.g., "friends1"
  name      String             // Display name, defaults to slug
  createdAt DateTime @default(now())

  players Player[]
}

model Player {
  id             String   @id @default(cuid())
  groupId        String
  name           String
  email          String
  favoriteTeamId String?
  minnowTeamId   String?
  createdAt      DateTime @default(now())

  group             Group              @relation(fields: [groupId], references: [id])
  favoriteTeam      Team?              @relation("FavoriteTeam", fields: [favoriteTeamId], references: [id])
  minnowTeam        Team?              @relation("MinnowTeam", fields: [minnowTeamId], references: [id])
  sessions          Session[]
  groupPredictions  GroupPrediction[]
  knockoutPredictions KnockoutPrediction[]
  matchScores       MatchScore[]

  @@unique([groupId, email])  // same email can exist in different groups
}

model Match {
  id            String   @id @default(cuid())
  homeTeamId    String?          // nullable for knockout matches where team is TBD
  awayTeamId    String?          // nullable for knockout matches where team is TBD
  group         String?
  stage         String   // 'group' | 'knockout'
  knockoutRound String?
  venue         String
  kickoffTime   DateTime
  status        String   @default("upcoming")
  homeScore     Int?
  awayScore     Int?
  penaltyWinner String?  // 'home' | 'away' | null — only for knockout matches decided by penalties
  homeSlotLabel String?  // e.g., "1st Group A", "Winner Match 49" — for display before teams are assigned
  awaySlotLabel String?  // e.g., "2nd Group B", "Winner Match 50"

  homeTeam         Team?            @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam         Team?            @relation("AwayTeam", fields: [awayTeamId], references: [id])
  groupPredictions GroupPrediction[]
  knockoutPredictions KnockoutPrediction[]
  matchScores      MatchScore[]
}

model GroupPrediction {
  id        String   @id @default(cuid())
  playerId  String
  matchId   String
  homeScore Int
  awayScore Int
  submittedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
  match  Match  @relation(fields: [matchId], references: [id])

  @@unique([playerId, matchId])
}

model MatchScore {
  id               String  @id @default(cuid())
  playerId         String
  matchId          String
  basePoints       Int
  oddsMultiplier   Float
  teamMultiplier   Int
  totalPoints      Float
  correctResult    Boolean
  correctExactScore Boolean

  player Player @relation(fields: [playerId], references: [id])
  match  Match  @relation(fields: [matchId], references: [id])

  @@unique([playerId, matchId])
}

model KnockoutPrediction {
  id            String   @id @default(cuid())
  playerId      String
  matchId       String
  homeScore     Int
  awayScore     Int
  penaltyWinner String?  // 'home' | 'away' — required when homeScore === awayScore, null otherwise
  submittedAt   DateTime @default(now())
  updatedAt     DateTime @updatedAt

  player Player @relation(fields: [playerId], references: [id])
  match  Match  @relation(fields: [matchId], references: [id])

  @@unique([playerId, matchId])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Scoring Formula Correctness

*For any* valid combination of base points (0, 1, or 4), odds multiplier (0.00–2.00), and team multiplier (1, 2, or 4), the calculated total points SHALL equal `round(basePoints × oddsMultiplier × teamMultiplier, 2)`.

**Validates: Requirements 3.4, 13.1**

### Property 2: Base Points Calculation

*For any* group stage match prediction and actual result pair:
- If the predicted score exactly matches the actual score, base points SHALL be 4 (1 for correct result + 3 for exact score)
- If the predicted outcome (home win / away win / draw) matches the actual outcome but scores differ, base points SHALL be 1
- Otherwise, base points SHALL be 0

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Odds Multiplier Calculation

*For any* set of group stage predictions for a match where total predictions > 0:
- For each outcome with at least one prediction, the odds multiplier SHALL equal `round(2 - (predictionsForOutcome / totalPredictions), 2)`
- For each outcome with zero predictions, the odds multiplier SHALL be 0
- All non-zero odds multipliers SHALL fall within the range [1.00, 2.00]

**Validates: Requirements 8.2, 8.3, 8.6, 8.7**

### Property 4: Team Multiplier Calculation

*For any* match and player with team selections:
- If neither team in the match is the player's favorite or minnow, team multiplier SHALL be 1
- If exactly one team in the match is the player's favorite XOR minnow (but not both roles), team multiplier SHALL be 2
- If a team in the match is both the player's favorite AND minnow (same team selected for both), team multiplier SHALL be 4
- If one team is the player's favorite and the other team is the player's minnow, team multiplier SHALL be 4

**Validates: Requirements 13.2, 13.3, 13.4, 13.5, 13.6, 6.5, 7.5, 7.7**

### Property 5: Knockout Stage Scoring with Penalties

*For any* knockout stage match prediction and actual result pair:
- If the actual result has unequal scores: correctness is determined the same as group stage (exact score → 4, correct winner → 1, wrong → 0)
- If the actual result is a draw (decided by penalties): a prediction is "correct result" only if it predicts equal scores AND the correct penalty winner. A prediction is "correct exact score" only if it predicts the exact drawn scoreline AND the correct penalty winner.
- The odds multiplier for knockout matches SHALL be calculated using the same formula as group stage, with outcomes being: home win, away win, or draw (penalties).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 6: Group Prediction Deadline Enforcement

*For any* match with kickoff time K and any timestamp T:
- If T < K - 2 hours, prediction submission SHALL be accepted
- If T ≥ K - 2 hours, prediction submission SHALL be rejected

**Validates: Requirements 2.4, 2.5**

### Property 7: Knockout Prediction Deadline Enforcement

*For any* knockout match with kickoff time K and any timestamp T:
- If T < K - 2 hours, prediction submission SHALL be accepted
- If T ≥ K - 2 hours, prediction submission SHALL be rejected

This is the same rule as group stage (Property 6), applied per-match.

**Validates: Requirements 4.6, 4.7**

### Property 8: Team Selection Deadline Enforcement

*For any* timestamp T and the first match kickoff time F:
- If T < F - 2 hours, team selection (favorite/minnow) SHALL be accepted
- If T ≥ F - 2 hours, team selection SHALL be rejected

**Validates: Requirements 6.2, 6.3, 7.2, 7.3**

### Property 9: Prediction Persistence Round-Trip

*For any* valid group stage prediction (player, match, homeScore 0-20, awayScore 0-20) submitted before the deadline, retrieving the prediction for that player and match SHALL return the most recently submitted scores.

**Validates: Requirements 2.2, 2.3**

### Property 10: Leaderboard Ordering

*For any* set of players with scores, the leaderboard SHALL be ordered such that:
- Players with higher total points appear before players with lower total points
- Among players with equal total points, those with more correct exact score predictions appear first
- Among players with equal total points AND equal exact scores, alphabetical order of name determines position

**Validates: Requirements 9.1, 9.4**

### Property 11: Time Zone Conversion

*For any* valid UTC timestamp, the displayed times SHALL correctly represent the same instant in US Eastern (America/New_York), UK (Europe/London), and India Standard Time (Asia/Kolkata) time zones, accounting for daylight saving transitions.

**Validates: Requirements 10.1**

### Property 12: Prediction Deadline Derivation

*For any* match with kickoff time K, the prediction deadline SHALL equal K minus exactly 2 hours.

**Validates: Requirements 10.3**

### Property 13: Match Status Derivation

*For any* match with kickoff time K, recorded result R, and current time T:
- If R exists (homeScore and awayScore are set), status SHALL be "completed"
- If T ≥ K and R does not exist, status SHALL be "in_progress"
- If T < K, status SHALL be "upcoming"

**Validates: Requirements 10.5**

### Property 14: Score Input Validation

*For any* score value V submitted as a prediction:
- If V is an integer and 0 ≤ V ≤ 20, the submission SHALL be accepted
- If V is not an integer OR V < 0 OR V > 20, the submission SHALL be rejected

**Validates: Requirements 2.7**

### Property 15: Single Team Selection Constraint

*For any* player and any sequence of favorite team selections, the player SHALL have exactly one (or zero) favorite team stored at any time — the most recent valid selection. The same constraint applies independently to minnow team selections.

**Validates: Requirements 6.1, 7.1**

### Property 16: Knockout Penalty Winner Validation

*For any* knockout stage prediction:
- If homeScore === awayScore, penaltyWinner MUST be either 'home' or 'away' (not null)
- If homeScore !== awayScore, penaltyWinner MUST be null
- A knockout prediction with equal scores and no penalty winner selection SHALL be rejected

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 17: Group Data Isolation

*For any* two distinct groups G1 and G2, and any player P1 in G1 and player P2 in G2:
- The leaderboard for G1 SHALL never include players from G2 and vice versa
- The odds multiplier for a match in G1 SHALL be calculated only from predictions made by players in G1
- A player's session in G1 SHALL not grant access to data in G2
- The 50-player limit SHALL be enforced independently per group

**Validates: Requirements 1.3, 1.5, 8.2, 9.1, 15.1, 15.2, 15.3, 15.4**

## Error Handling

### Authentication Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| SSO provider unavailable | Display "Authentication service temporarily unavailable" with retry option |
| Magic link expired (>15 min) | Display "Link expired" with option to request new link |
| Magic link already used | Display "Link already used" with option to request new link |
| Max players reached (50) | Display "Game is full" message, reject registration |
| Invalid session token | Redirect to login page |
| Session expired | Redirect to login page with "Session expired" message |

### Prediction Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Score out of range (not 0-20) | Client-side validation + server rejection with message |
| Non-integer score | Client-side validation + server rejection with message |
| Prediction after deadline | Display "Predictions closed" with deadline time shown |
| Knockout equal scores without penalty winner | Client-side validation + server rejection with message |
| Database write failure | Return 500 with "Unable to save prediction, please try again" |

### Missing Prediction UI Indicators

The system provides visual cues to help players identify incomplete predictions:

- **Row highlighting**: Matches without a prediction (or with an incomplete knockout prediction) are highlighted with a distinct background color and an (ℹ) info icon.
- **Tooltip on hover/tap**: Explains what is missing — "No prediction submitted" or "Penalty winner selection is missing".
- **Stage summary counter**: Each stage/round view shows "X of Y predictions submitted" at the top.
- **Scope**: Group stage matches are one set (all visible from day one). Each knockout round is a separate set (visible once teams are confirmed).
- **Non-blocking**: Highlighting is informational only. Players can submit individual predictions without completing the full stage.
- **Deadline-aware**: Only matches with open deadlines are highlighted. Past-deadline matches without predictions are not highlighted (nothing can be done).

### Scoring Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Match result recorded twice | Idempotent operation — recalculate and overwrite scores |
| Missing predictions for scoring | Award 0 points, skip player for that match |
| Division by zero in odds (0 total predictions) | No multipliers calculated — no one predicted, no one scores |

### General Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Database connection failure | Return 503 with "Service temporarily unavailable" |
| Unexpected server error | Log error details, return generic 500 message |
| Rate limiting (>10 requests/sec per user) | Return 429 with "Too many requests" |

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and component behavior:

- **Scoring engine**: Specific score scenarios (e.g., predict 2-1, actual 2-1 → 4 base points)
- **Odds multiplier edge cases**: Single prediction, unanimous predictions, zero predictions for an outcome
- **Team multiplier edge cases**: Same team as both favorite and minnow, both teams in match selected
- **Deadline boundary**: Exact moment of deadline (millisecond precision)
- **Input validation**: Boundary values (0, 20, -1, 21, 1.5, NaN)
- **Leaderboard tiebreaker**: Players with identical points and exact scores
- **Auth flow**: Token generation, verification, expiry, single-use enforcement

### Property-Based Tests

Property-based tests verify universal correctness properties using randomized inputs. Each property test runs a minimum of 100 iterations.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript property-based testing)

**Properties to implement**:

| Property | Tag |
|----------|-----|
| Scoring formula | Feature: world-cup-predictor, Property 1: Scoring formula correctness |
| Base points calculation | Feature: world-cup-predictor, Property 2: Base points calculation |
| Odds multiplier calculation | Feature: world-cup-predictor, Property 3: Odds multiplier calculation |
| Team multiplier calculation | Feature: world-cup-predictor, Property 4: Team multiplier calculation |
| Knockout round scoring | Feature: world-cup-predictor, Property 5: Knockout stage scoring with penalties |
| Group prediction deadline | Feature: world-cup-predictor, Property 6: Group prediction deadline enforcement |
| Knockout prediction deadline | Feature: world-cup-predictor, Property 7: Knockout prediction deadline enforcement |
| Team selection deadline | Feature: world-cup-predictor, Property 8: Team selection deadline enforcement |
| Prediction persistence | Feature: world-cup-predictor, Property 9: Prediction persistence round-trip |
| Leaderboard ordering | Feature: world-cup-predictor, Property 10: Leaderboard ordering |
| Time zone conversion | Feature: world-cup-predictor, Property 11: Time zone conversion |
| Prediction deadline derivation | Feature: world-cup-predictor, Property 12: Prediction deadline derivation |
| Match status derivation | Feature: world-cup-predictor, Property 13: Match status derivation |
| Score input validation | Feature: world-cup-predictor, Property 14: Score input validation |
| Single team selection | Feature: world-cup-predictor, Property 15: Single team selection constraint |

**Properties to implement (continued)**:

| Property | Tag |
|----------|-----|
| Knockout penalty winner validation | Feature: world-cup-predictor, Property 16: Knockout penalty winner validation |
| Group data isolation | Feature: world-cup-predictor, Property 17: Group data isolation |

**Configuration**: Each property test must run with `numRuns: 100` minimum.

### Integration Tests

- **Auth flow end-to-end**: SSO redirect/callback, magic link send/verify
- **Prediction submission**: Full request cycle through API to database
- **Score calculation trigger**: Match result entry → score calculation → leaderboard update
- **Deployment modes**: Verify both internal and external configs boot correctly with SQLite (same engine, different file paths via `DATABASE_URL`)
- **Data persistence**: Verify data survives application restart

### End-to-End Tests

- **Player journey**: Register → select teams → batch predict matches (inline scores) → view leaderboard
- **Admin journey**: Record match results → verify scores calculated → verify leaderboard updated
- **Deadline enforcement**: Attempt predictions at various times relative to deadlines
- **Browser compatibility**: Smoke tests on Chrome, Firefox, Safari, Edge (latest 2 versions)

