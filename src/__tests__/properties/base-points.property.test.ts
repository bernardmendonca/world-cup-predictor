import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateBasePoints } from "@/lib/scoring/base-points";

describe("Property 2: Base Points Calculation", () => {
  const scoreArb = fc.integer({ min: 0, max: 20 });

  it("exact score match always yields 3 points", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (home, away) => {
        const result = calculateBasePoints(home, away, home, away);
        expect(result.basePoints).toBe(3);
        expect(result.correctResult).toBe(true);
        expect(result.correctExactScore).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("correct result with wrong score yields 1 point", () => {
    fc.assert(
      fc.property(
        scoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (predHome, predAway, actHome, actAway) => {
          // Skip exact matches
          fc.pre(predHome !== actHome || predAway !== actAway);
          // Ensure same outcome (home win, away win, or draw)
          const predOutcome =
            predHome > predAway ? "home" : predHome < predAway ? "away" : "draw";
          const actOutcome =
            actHome > actAway ? "home" : actHome < actAway ? "away" : "draw";
          fc.pre(predOutcome === actOutcome);

          const result = calculateBasePoints(predHome, predAway, actHome, actAway);
          expect(result.basePoints).toBe(1);
          expect(result.correctResult).toBe(true);
          expect(result.correctExactScore).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("incorrect result yields 0 points", () => {
    fc.assert(
      fc.property(
        scoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (predHome, predAway, actHome, actAway) => {
          const predOutcome =
            predHome > predAway ? "home" : predHome < predAway ? "away" : "draw";
          const actOutcome =
            actHome > actAway ? "home" : actHome < actAway ? "away" : "draw";
          fc.pre(predOutcome !== actOutcome);

          const result = calculateBasePoints(predHome, predAway, actHome, actAway);
          expect(result.basePoints).toBe(0);
          expect(result.correctResult).toBe(false);
          expect(result.correctExactScore).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("base points are always 0, 1, or 3", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, scoreArb, scoreArb, (pH, pA, aH, aA) => {
        const result = calculateBasePoints(pH, pA, aH, aA);
        expect([0, 1, 3]).toContain(result.basePoints);
      }),
      { numRuns: 100 }
    );
  });
});
