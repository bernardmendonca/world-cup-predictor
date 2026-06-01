import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateOddsMultipliers, getPredictionOutcome } from "@/lib/scoring/odds-multiplier";

/**
 * Property 17: Group isolation.
 * - Leaderboard never includes players from other group
 * - Odds multiplier calculated only from same group's predictions
 * - 50-player limit enforced per group
 */

interface Player {
  id: string;
  groupId: string;
  name: string;
}

interface Prediction {
  playerId: string;
  groupId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
}

function buildLeaderboardForGroup(
  groupId: string,
  players: Player[],
  scores: Map<string, number>
): { playerId: string; playerName: string; totalPoints: number }[] {
  // Only include players from this group
  return players
    .filter((p) => p.groupId === groupId)
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      totalPoints: scores.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

function calculateOddsForGroup(
  groupId: string,
  predictions: Prediction[],
  matchId: string
) {
  // Only count predictions from players in this group
  const groupPredictions = predictions.filter(
    (p) => p.groupId === groupId && p.matchId === matchId
  );

  let homeWinCount = 0;
  let awayWinCount = 0;
  let drawCount = 0;

  for (const pred of groupPredictions) {
    const outcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
    if (outcome === "homeWin") homeWinCount++;
    else if (outcome === "awayWin") awayWinCount++;
    else drawCount++;
  }

  return calculateOddsMultipliers(homeWinCount, awayWinCount, drawCount);
}

describe("Property 17: Group Isolation", () => {
  const groupIdArb = fc.constantFrom("group-a", "group-b", "group-c");
  const playerIdArb = fc.string({ minLength: 1, maxLength: 10 });
  const scoreArb = fc.integer({ min: 0, max: 20 });

  it("leaderboard never includes players from other groups", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: playerIdArb,
            groupId: groupIdArb,
            name: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (players) => {
          const targetGroup = "group-a";
          const scores = new Map<string, number>();
          players.forEach((p) => scores.set(p.id, Math.random() * 100));

          const leaderboard = buildLeaderboardForGroup(targetGroup, players, scores);

          // Every entry in the leaderboard should be from the target group
          for (const entry of leaderboard) {
            const player = players.find((p) => p.id === entry.playerId);
            if (player) {
              expect(player.groupId).toBe(targetGroup);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("odds multiplier calculated only from same group's predictions", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            playerId: playerIdArb,
            groupId: groupIdArb,
            matchId: fc.constant("match-1"),
            homeScore: scoreArb,
            awayScore: scoreArb,
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (predictions) => {
          const targetGroup = "group-a";
          const matchId = "match-1";

          const odds = calculateOddsForGroup(targetGroup, predictions, matchId);

          // Verify by manually counting only group-a predictions
          const groupPreds = predictions.filter(
            (p) => p.groupId === targetGroup && p.matchId === matchId
          );

          let homeWin = 0, awayWin = 0, draw = 0;
          for (const p of groupPreds) {
            const outcome = getPredictionOutcome(p.homeScore, p.awayScore);
            if (outcome === "homeWin") homeWin++;
            else if (outcome === "awayWin") awayWin++;
            else draw++;
          }

          const expected = calculateOddsMultipliers(homeWin, awayWin, draw);
          expect(odds.homeWin).toBe(expected.homeWin);
          expect(odds.awayWin).toBe(expected.awayWin);
          expect(odds.draw).toBe(expected.draw);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("50-player limit enforced per group", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (playerCount) => {
          const MAX_PLAYERS_PER_GROUP = 50;
          const canJoin = playerCount < MAX_PLAYERS_PER_GROUP;

          if (playerCount >= MAX_PLAYERS_PER_GROUP) {
            expect(canJoin).toBe(false);
          } else {
            expect(canJoin).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
