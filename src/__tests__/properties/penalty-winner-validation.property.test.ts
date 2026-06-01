import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 16: Penalty winner validation for knockout predictions.
 * - homeScore === awayScore → penaltyWinner must be 'home' or 'away'
 * - homeScore !== awayScore → penaltyWinner must be null
 */

type PenaltyWinner = "home" | "away" | null;

function validatePenaltyWinner(
  homeScore: number,
  awayScore: number,
  penaltyWinner: PenaltyWinner
): { valid: boolean; message?: string } {
  if (homeScore === awayScore) {
    if (penaltyWinner !== "home" && penaltyWinner !== "away") {
      return {
        valid: false,
        message: "Penalty winner selection is required when scores are equal.",
      };
    }
    return { valid: true };
  } else {
    if (penaltyWinner !== null) {
      return {
        valid: false,
        message: "Penalty winner must be null when scores are unequal.",
      };
    }
    return { valid: true };
  }
}

describe("Property 16: Penalty Winner Validation", () => {
  const scoreArb = fc.integer({ min: 0, max: 20 });
  const penaltyWinnerArb = fc.constantFrom("home" as const, "away" as const);

  it("equal scores require penaltyWinner to be 'home' or 'away'", () => {
    fc.assert(
      fc.property(scoreArb, penaltyWinnerArb, (score, winner) => {
        const result = validatePenaltyWinner(score, score, winner);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("equal scores with null penaltyWinner is invalid", () => {
    fc.assert(
      fc.property(scoreArb, (score) => {
        const result = validatePenaltyWinner(score, score, null);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("unequal scores require penaltyWinner to be null", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (home, away) => {
        fc.pre(home !== away);
        const result = validatePenaltyWinner(home, away, null);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("unequal scores with non-null penaltyWinner is invalid", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, penaltyWinnerArb, (home, away, winner) => {
        fc.pre(home !== away);
        const result = validatePenaltyWinner(home, away, winner);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
