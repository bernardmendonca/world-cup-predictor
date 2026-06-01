import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateBasePoints } from "@/lib/scoring/base-points";

describe("Property 5: Knockout Penalty Scoring", () => {
  const scoreArb = fc.integer({ min: 0, max: 20 });
  const penaltyWinnerArb = fc.constantFrom("home" as const, "away" as const);

  it("unequal actual scores → same as group stage scoring (no penalty logic)", () => {
    fc.assert(
      fc.property(
        scoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (predHome, predAway, actHome, actAway) => {
          // Ensure actual scores are unequal (no penalties)
          fc.pre(actHome !== actAway);

          const withPenalty = calculateBasePoints(
            predHome,
            predAway,
            actHome,
            actAway,
            null,
            null
          );
          const withoutPenalty = calculateBasePoints(
            predHome,
            predAway,
            actHome,
            actAway
          );

          expect(withPenalty.basePoints).toBe(withoutPenalty.basePoints);
          expect(withPenalty.correctResult).toBe(withoutPenalty.correctResult);
          expect(withPenalty.correctExactScore).toBe(withoutPenalty.correctExactScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("equal actual scores with penalties: correct result requires equal predicted scores + correct penalty winner", () => {
    fc.assert(
      fc.property(
        scoreArb,
        scoreArb,
        scoreArb,
        penaltyWinnerArb,
        (predScore, actScore, otherPredScore, actualPenaltyWinner) => {
          // Actual is a draw decided by penalties
          const predDraw = predScore; // predicted draw score
          const correctPenalty = actualPenaltyWinner;
          const wrongPenalty = actualPenaltyWinner === "home" ? "away" : "home";

          // Correct: predicted draw + correct penalty winner
          const correctResult = calculateBasePoints(
            predDraw,
            predDraw,
            actScore,
            actScore,
            correctPenalty,
            actualPenaltyWinner
          );
          expect(correctResult.correctResult).toBe(true);
          expect(correctResult.basePoints).toBeGreaterThanOrEqual(1);

          // Wrong penalty winner: incorrect
          const wrongPenaltyResult = calculateBasePoints(
            predDraw,
            predDraw,
            actScore,
            actScore,
            wrongPenalty,
            actualPenaltyWinner
          );
          expect(wrongPenaltyResult.basePoints).toBe(0);
          expect(wrongPenaltyResult.correctResult).toBe(false);

          // Non-draw prediction: incorrect
          fc.pre(otherPredScore !== predDraw);
          const nonDrawResult = calculateBasePoints(
            predDraw,
            otherPredScore,
            actScore,
            actScore,
            correctPenalty,
            actualPenaltyWinner
          );
          expect(nonDrawResult.basePoints).toBe(0);
          expect(nonDrawResult.correctResult).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exact score in penalties requires exact drawn scoreline + correct penalty winner", () => {
    fc.assert(
      fc.property(scoreArb, penaltyWinnerArb, (score, penaltyWinner) => {
        // Exact match: same draw score + correct penalty winner → 4 points
        const exact = calculateBasePoints(
          score,
          score,
          score,
          score,
          penaltyWinner,
          penaltyWinner
        );
        expect(exact.basePoints).toBe(4);
        expect(exact.correctExactScore).toBe(true);

        // Different draw score + correct penalty winner → 1 point (correct result, not exact)
        const otherScore = (score + 1) % 21;
        const correctButNotExact = calculateBasePoints(
          otherScore,
          otherScore,
          score,
          score,
          penaltyWinner,
          penaltyWinner
        );
        expect(correctButNotExact.basePoints).toBe(1);
        expect(correctButNotExact.correctResult).toBe(true);
        expect(correctButNotExact.correctExactScore).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
