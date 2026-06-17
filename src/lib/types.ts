// ===== Core Domain Types =====

export type KnockoutRound =
  | "round_of_32"
  | "round_of_16"
  | "quarter_finals"
  | "semi_finals"
  | "third_place"
  | "final";

export type MatchStatus = "upcoming" | "in_progress" | "completed";
export type MatchStage = "group" | "knockout";
export type PenaltyWinner = "home" | "away";

// ===== Group =====

export interface Group {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
}

// ===== Team =====

export interface Team {
  id: string;
  name: string;
  code: string;
  groupLetter: string;
  confederation: string;
  fifaRanking: number;
}

// ===== Match =====

export interface Match {
  id: string;
  matchNumber: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  groupLetter: string | null;
  stage: MatchStage;
  knockoutRound: KnockoutRound | null;
  venue: string;
  kickoffTime: Date;
  predictionDeadline: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner: PenaltyWinner | null;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
}

// ===== Predictions =====

export interface GroupPrediction {
  id: string;
  playerId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  submittedAt: Date;
  updatedAt: Date;
}

export interface KnockoutPrediction {
  id: string;
  playerId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner: PenaltyWinner | null;
  submittedAt: Date;
  updatedAt: Date;
}

// ===== Scoring =====

export interface MatchScoreResult {
  playerId: string;
  matchId: string;
  basePoints: number;
  oddsMultiplier: number;
  teamMultiplier: number;
  totalPoints: number;
  correctResult: boolean;
  correctExactScore: boolean;
}

export interface OddsMultipliers {
  homeWin: number;
  awayWin: number;
  draw: number;
}

// ===== Team Selection =====

export interface TeamSelections {
  favoriteTeamId: string | null;
  minnowTeamId: string | null;
}

// ===== Leaderboard =====

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  favoriteTeam: string | null;
  minnowTeam: string | null;
  groupStagePoints: number;
  knockoutPoints: number;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
}

// ===== Time Zone Display =====

export interface TimeZoneDisplay {
  eastern: string;
  uk: string;
  ist: string;
  aest: string;
}

// ===== Session =====

export interface Session {
  id: string;
  playerId: string;
  playerName: string;
  groupId: string;
  groupSlug: string;
  expiresAt: Date;
}

// ===== Admin =====

export interface AdminResultResponse {
  success: boolean;
  matchId: string;
  playersScored: number;
  averagePoints: number;
  leaderboardUpdated: boolean;
}

export interface BracketStatus {
  rounds: {
    round: KnockoutRound;
    totalMatches: number;
    teamsAssigned: number;
    resultsRecorded: number;
    readyForNextRound: boolean;
  }[];
}

export interface PendingAssignment {
  matchId: string;
  knockoutRound: KnockoutRound;
  homeTeamSlot: string;
  awayTeamSlot: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

// ===== Prediction Result =====

export interface PredictionResult {
  success: boolean;
  message: string;
}
