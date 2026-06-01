/**
 * Calculate base points for a prediction against an actual result.
 *
 * - Exact score match: 4 points (1 for correct result + 3 for exact score)
 * - Correct result only: 1 point
 * - Incorrect: 0 points
 *
 * For knockout matches decided by penalties (equal scores), the penaltyWinner
 * must also match for the prediction to be considered correct.
 */
export function calculateBasePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  predictedPenaltyWinner?: "home" | "away" | null,
  actualPenaltyWinner?: "home" | "away" | null
): { basePoints: number; correctResult: boolean; correctExactScore: boolean } {
  const isKnockoutPenalties = actualHome === actualAway && actualPenaltyWinner != null;

  if (isKnockoutPenalties) {
    // Knockout match decided by penalties
    const predictedDraw = predictedHome === predictedAway;
    const penaltyMatch = predictedPenaltyWinner === actualPenaltyWinner;

    if (!predictedDraw || !penaltyMatch) {
      // Wrong result: either didn't predict a draw, or picked wrong penalty winner
      return { basePoints: 0, correctResult: false, correctExactScore: false };
    }

    // Predicted draw + correct penalty winner
    const exactScore = predictedHome === actualHome && predictedAway === actualAway;
    if (exactScore) {
      return { basePoints: 4, correctResult: true, correctExactScore: true };
    }
    // Correct result (draw + right penalty winner) but not exact score
    return { basePoints: 1, correctResult: true, correctExactScore: false };
  }

  // Regular match (group stage, or knockout decided in regular/extra time)
  const exactScore = predictedHome === actualHome && predictedAway === actualAway;
  if (exactScore) {
    return { basePoints: 4, correctResult: true, correctExactScore: true };
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  if (predictedOutcome === actualOutcome) {
    return { basePoints: 1, correctResult: true, correctExactScore: false };
  }

  return { basePoints: 0, correctResult: false, correctExactScore: false };
}

type Outcome = "home" | "away" | "draw";

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}
