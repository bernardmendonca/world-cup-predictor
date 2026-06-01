import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 10: Leaderboard ordering.
 * For any set of player scores:
 * - Higher total points → higher rank
 * - Equal points → more exact scores first
 * - Equal both → alphabetical name
 */

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalPoints: number;
  correctPredictions: number;
  exactScores: number;
}

function buildLeaderboard(
  players: { name: string; totalPoints: number; exactScores: number; correctPredictions: number }[]
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = players.map((p, i) => ({
    rank: 0,
    playerId: `player-${i}`,
    playerName: p.name,
    totalPoints: Math.round(p.totalPoints * 100) / 100,
    correctPredictions: p.correctPredictions,
    exactScores: p.exactScores,
  }));

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return a.playerName.localeCompare(b.playerName);
  });

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}

describe("Property 10: Leaderboard Ordering", () => {
  const playerArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    totalPoints: fc.double({ min: 0, max: 500, noNaN: true }),
    exactScores: fc.integer({ min: 0, max: 50 }),
    correctPredictions: fc.integer({ min: 0, max: 100 }),
  });

  it("higher total points → higher rank (lower rank number)", () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 20 }),
        (players) => {
          const leaderboard = buildLeaderboard(players);

          for (let i = 0; i < leaderboard.length - 1; i++) {
            const current = leaderboard[i];
            const next = leaderboard[i + 1];

            if (current.totalPoints > next.totalPoints) {
              expect(current.rank).toBeLessThan(next.rank);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("equal points → more exact scores gets higher rank", () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 20 }),
        (players) => {
          const leaderboard = buildLeaderboard(players);

          for (let i = 0; i < leaderboard.length - 1; i++) {
            const current = leaderboard[i];
            const next = leaderboard[i + 1];

            if (
              current.totalPoints === next.totalPoints &&
              current.exactScores > next.exactScores
            ) {
              expect(current.rank).toBeLessThan(next.rank);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("equal points and exact scores → alphabetical name order", () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 20 }),
        (players) => {
          const leaderboard = buildLeaderboard(players);

          for (let i = 0; i < leaderboard.length - 1; i++) {
            const current = leaderboard[i];
            const next = leaderboard[i + 1];

            if (
              current.totalPoints === next.totalPoints &&
              current.exactScores === next.exactScores
            ) {
              expect(current.playerName.localeCompare(next.playerName)).toBeLessThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ranks are sequential starting from 1", () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 1, maxLength: 20 }),
        (players) => {
          const leaderboard = buildLeaderboard(players);

          for (let i = 0; i < leaderboard.length; i++) {
            expect(leaderboard[i].rank).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
