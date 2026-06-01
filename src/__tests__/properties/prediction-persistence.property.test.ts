import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 9: For any valid prediction submitted before deadline,
 * retrieving it returns the most recent values.
 *
 * Tests the pure logic of prediction storage (last-write-wins semantics)
 * without requiring a database.
 */

interface Prediction {
  playerId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  updatedAt: Date;
}

// Simulates an in-memory prediction store with upsert semantics
class PredictionStore {
  private store = new Map<string, Prediction>();

  private key(playerId: string, matchId: string): string {
    return `${playerId}:${matchId}`;
  }

  submit(playerId: string, matchId: string, homeScore: number, awayScore: number): void {
    const key = this.key(playerId, matchId);
    this.store.set(key, {
      playerId,
      matchId,
      homeScore,
      awayScore,
      updatedAt: new Date(),
    });
  }

  get(playerId: string, matchId: string): Prediction | undefined {
    return this.store.get(this.key(playerId, matchId));
  }
}

describe("Property 9: Prediction Persistence (Pure Logic)", () => {
  const scoreArb = fc.integer({ min: 0, max: 20 });
  const idArb = fc.string({ minLength: 1, maxLength: 10 });

  it("retrieving a prediction returns the most recently submitted values", () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        fc.array(fc.tuple(scoreArb, scoreArb), { minLength: 1, maxLength: 10 }),
        (playerId, matchId, submissions) => {
          const store = new PredictionStore();

          // Submit multiple predictions (simulating updates)
          for (const [home, away] of submissions) {
            store.submit(playerId, matchId, home, away);
          }

          // The last submission should be what we get back
          const lastSubmission = submissions[submissions.length - 1];
          const retrieved = store.get(playerId, matchId);

          expect(retrieved).toBeDefined();
          expect(retrieved!.homeScore).toBe(lastSubmission[0]);
          expect(retrieved!.awayScore).toBe(lastSubmission[1]);
          expect(retrieved!.playerId).toBe(playerId);
          expect(retrieved!.matchId).toBe(matchId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("predictions for different matches are independent", () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        scoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (playerId, matchId1, matchId2, h1, a1, h2, a2) => {
          fc.pre(matchId1 !== matchId2);

          const store = new PredictionStore();
          store.submit(playerId, matchId1, h1, a1);
          store.submit(playerId, matchId2, h2, a2);

          const pred1 = store.get(playerId, matchId1);
          const pred2 = store.get(playerId, matchId2);

          expect(pred1!.homeScore).toBe(h1);
          expect(pred1!.awayScore).toBe(a1);
          expect(pred2!.homeScore).toBe(h2);
          expect(pred2!.awayScore).toBe(a2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
