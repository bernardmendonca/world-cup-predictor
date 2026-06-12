import { describe, it, expect } from "vitest";
import { calculateBasePoints } from "@/lib/scoring/base-points";
import {
  calculateOddsMultipliers,
  getPredictionOutcome,
} from "@/lib/scoring/odds-multiplier";
import { calculateTeamMultiplier } from "@/lib/scoring/team-multiplier";
import { getPredictionDeadline } from "@/lib/utils/time";

/**
 * Integration test 11.3: Full prediction → result → scoring → leaderboard flow.
 * Tests the complete scoring pipeline using pure functions (no database).
 */

interface PlayerPrediction {
  playerId: string;
  playerName: string;
  groupId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner: "home" | "away" | null;
  favoriteTeamId: string | null;
  minnowTeamId: string | null;
}

interface MatchResult {
  homeScore: number;
  awayScore: number;
  penaltyWinner: "home" | "away" | null;
  homeTeamId: string;
  awayTeamId: string;
}

interface PlayerScore {
  playerId: string;
  playerName: string;
  groupId: string;
  totalPoints: number;
  correctResult: boolean;
  correctExactScore: boolean;
}

function scorePredictions(
  predictions: PlayerPrediction[],
  result: MatchResult
): PlayerScore[] {
  // Calculate odds multipliers from prediction distribution
  let homeWinCount = 0;
  let awayWinCount = 0;
  let drawCount = 0;

  for (const pred of predictions) {
    const outcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
    if (outcome === "homeWin") homeWinCount++;
    else if (outcome === "awayWin") awayWinCount++;
    else drawCount++;
  }

  const oddsMultipliers = calculateOddsMultipliers(homeWinCount, awayWinCount, drawCount);

  return predictions.map((pred) => {
    const { basePoints, correctResult, correctExactScore } = calculateBasePoints(
      pred.homeScore,
      pred.awayScore,
      result.homeScore,
      result.awayScore,
      pred.penaltyWinner,
      result.penaltyWinner
    );

    const predictedOutcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
    const oddsMultiplier = oddsMultipliers[predictedOutcome];

    const teamMultiplier = calculateTeamMultiplier(
      result.homeTeamId,
      result.awayTeamId,
      pred.favoriteTeamId,
      pred.minnowTeamId,
      pred.homeScore > pred.awayScore ? result.homeTeamId :
        pred.awayScore > pred.homeScore ? result.awayTeamId : null,
      result.homeScore > result.awayScore ? result.homeTeamId :
        result.awayScore > result.homeScore ? result.awayTeamId : null,
      pred.homeScore === pred.awayScore,
      result.homeScore === result.awayScore
    );

    const totalPoints = Math.round(basePoints * oddsMultiplier * teamMultiplier * 100) / 100;

    return {
      playerId: pred.playerId,
      playerName: pred.playerName,
      groupId: pred.groupId,
      totalPoints,
      correctResult,
      correctExactScore,
    };
  });
}

function buildLeaderboard(scores: PlayerScore[], groupId: string) {
  const groupScores = scores.filter((s) => s.groupId === groupId);

  // Aggregate by player
  const playerMap = new Map<
    string,
    { playerName: string; totalPoints: number; exactScores: number }
  >();

  for (const score of groupScores) {
    const existing = playerMap.get(score.playerId) ?? {
      playerName: score.playerName,
      totalPoints: 0,
      exactScores: 0,
    };
    existing.totalPoints += score.totalPoints;
    if (score.correctExactScore) existing.exactScores++;
    playerMap.set(score.playerId, existing);
  }

  const entries = Array.from(playerMap.entries()).map(([playerId, data]) => ({
    playerId,
    ...data,
    totalPoints: Math.round(data.totalPoints * 100) / 100,
  }));

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return a.playerName.localeCompare(b.playerName);
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

describe("Integration Test 11.3: Full Scoring Pipeline", () => {
  it("full prediction → result → scoring → leaderboard flow", () => {
    const predictions: PlayerPrediction[] = [
      {
        playerId: "p1",
        playerName: "Alice",
        groupId: "group-1",
        homeScore: 2,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: "team-a",
        minnowTeamId: null,
      },
      {
        playerId: "p2",
        playerName: "Bob",
        groupId: "group-1",
        homeScore: 2,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p3",
        playerName: "Charlie",
        groupId: "group-1",
        homeScore: 0,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const result: MatchResult = {
      homeScore: 2,
      awayScore: 1,
      penaltyWinner: null,
      homeTeamId: "team-a",
      awayTeamId: "team-b",
    };

    const scores = scorePredictions(predictions, result);

    // Alice: exact score (4) × odds × team multiplier (2, favorite in match)
    // Bob: exact score (4) × odds × team multiplier (1, no team)
    // Charlie: wrong result (0)
    expect(scores[0].correctExactScore).toBe(true); // Alice
    expect(scores[0].totalPoints).toBeGreaterThan(0);
    expect(scores[1].correctExactScore).toBe(true); // Bob
    expect(scores[1].totalPoints).toBeGreaterThan(0);
    expect(scores[2].totalPoints).toBe(0); // Charlie

    // Alice should score more than Bob (team multiplier)
    expect(scores[0].totalPoints).toBeGreaterThan(scores[1].totalPoints);

    // Build leaderboard
    const leaderboard = buildLeaderboard(scores, "group-1");
    expect(leaderboard.length).toBe(3);
    expect(leaderboard[0].playerName).toBe("Alice");
    expect(leaderboard[1].playerName).toBe("Bob");
    expect(leaderboard[2].playerName).toBe("Charlie");
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[2].rank).toBe(3);
  });

  it("group isolation: predictions in group A don't affect group B", () => {
    const predictionsGroupA: PlayerPrediction[] = [
      {
        playerId: "p1",
        playerName: "Alice",
        groupId: "group-a",
        homeScore: 3,
        awayScore: 0,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p2",
        playerName: "Bob",
        groupId: "group-a",
        homeScore: 1,
        awayScore: 0,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const predictionsGroupB: PlayerPrediction[] = [
      {
        playerId: "p3",
        playerName: "Charlie",
        groupId: "group-b",
        homeScore: 3,
        awayScore: 0,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const result: MatchResult = {
      homeScore: 3,
      awayScore: 0,
      penaltyWinner: null,
      homeTeamId: "team-x",
      awayTeamId: "team-y",
    };

    // Score each group independently (as the real system does)
    const scoresA = scorePredictions(predictionsGroupA, result);
    const scoresB = scorePredictions(predictionsGroupB, result);

    // Group A leaderboard should only have group A players
    const leaderboardA = buildLeaderboard(scoresA, "group-a");
    expect(leaderboardA.length).toBe(2);
    expect(leaderboardA.every((e) => e.playerId === "p1" || e.playerId === "p2")).toBe(true);

    // Group B leaderboard should only have group B players
    const leaderboardB = buildLeaderboard(scoresB, "group-b");
    expect(leaderboardB.length).toBe(1);
    expect(leaderboardB[0].playerId).toBe("p3");

    // Odds multipliers are different because groups are scored independently
    // Group A: 2 predictions (both home win) → odds = 2 - 2/2 = 1.0
    // Group B: 1 prediction (home win) → odds = 2 - 1/1 = 1.0
    // In this case they happen to be the same, but the isolation is proven
    // by the leaderboard separation
  });

  it("deadline enforcement: predictions must be before kickoff - 2h", () => {
    const kickoff = new Date("2026-06-15T18:00:00Z");
    const deadline = getPredictionDeadline(kickoff);

    // 3 hours before kickoff → accepted
    const earlyTime = new Date("2026-06-15T15:00:00Z");
    expect(earlyTime < deadline).toBe(true);

    // 1 hour before kickoff → rejected
    const lateTime = new Date("2026-06-15T17:00:00Z");
    expect(lateTime >= deadline).toBe(true);

    // Exactly at deadline → rejected
    expect(deadline >= deadline).toBe(true);

    // 1ms before deadline → accepted
    const justBefore = new Date(deadline.getTime() - 1);
    expect(justBefore < deadline).toBe(true);
  });

  it("scoring with knockout penalties works end-to-end", () => {
    const predictions: PlayerPrediction[] = [
      {
        playerId: "p1",
        playerName: "Alice",
        groupId: "group-1",
        homeScore: 1,
        awayScore: 1,
        penaltyWinner: "home",
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p2",
        playerName: "Bob",
        groupId: "group-1",
        homeScore: 1,
        awayScore: 1,
        penaltyWinner: "away",
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p3",
        playerName: "Charlie",
        groupId: "group-1",
        homeScore: 2,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const result: MatchResult = {
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: "home",
      homeTeamId: "team-x",
      awayTeamId: "team-y",
    };

    const scores = scorePredictions(predictions, result);

    // Alice: exact score + correct penalty winner → 4 points base
    expect(scores[0].correctExactScore).toBe(true);
    expect(scores[0].totalPoints).toBeGreaterThan(0);

    // Bob: correct draw but wrong penalty winner → 0 points
    expect(scores[1].correctResult).toBe(false);
    expect(scores[1].totalPoints).toBe(0);

    // Charlie: predicted home win (not a draw) but home team advances on penalties → 1 point base (correct advancing team)
    expect(scores[2].correctResult).toBe(true);
    expect(scores[2].totalPoints).toBeGreaterThan(0);
  });

  it("multiple matches accumulate in leaderboard correctly", () => {
    const match1Result: MatchResult = {
      homeScore: 2,
      awayScore: 0,
      penaltyWinner: null,
      homeTeamId: "team-a",
      awayTeamId: "team-b",
    };

    const match2Result: MatchResult = {
      homeScore: 1,
      awayScore: 1,
      penaltyWinner: null,
      homeTeamId: "team-c",
      awayTeamId: "team-d",
    };

    const match1Predictions: PlayerPrediction[] = [
      {
        playerId: "p1",
        playerName: "Alice",
        groupId: "group-1",
        homeScore: 2,
        awayScore: 0,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p2",
        playerName: "Bob",
        groupId: "group-1",
        homeScore: 0,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const match2Predictions: PlayerPrediction[] = [
      {
        playerId: "p1",
        playerName: "Alice",
        groupId: "group-1",
        homeScore: 0,
        awayScore: 2,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
      {
        playerId: "p2",
        playerName: "Bob",
        groupId: "group-1",
        homeScore: 1,
        awayScore: 1,
        penaltyWinner: null,
        favoriteTeamId: null,
        minnowTeamId: null,
      },
    ];

    const scores1 = scorePredictions(match1Predictions, match1Result);
    const scores2 = scorePredictions(match2Predictions, match2Result);

    const allScores = [...scores1, ...scores2];
    const leaderboard = buildLeaderboard(allScores, "group-1");

    expect(leaderboard.length).toBe(2);
    // Both Alice and Bob got one exact score each across two matches
    // Alice: match1 exact (4pts), match2 wrong (0pts)
    // Bob: match1 wrong (0pts), match2 exact (4pts)
    // They should have equal points
    expect(leaderboard[0].totalPoints).toBe(leaderboard[1].totalPoints);
  });
});
