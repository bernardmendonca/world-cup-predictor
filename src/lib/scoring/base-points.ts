/**
 * Calculate base points for a prediction against an actual result.
 *
 * - Exact score match: 3 points (1 for correct result + 2 for exact score)
 * - Correct result only: 1 point
 * - Incorrect: 0 points
 *
 * For knockout matches decided by penalties (equal scores):
 * - Predicted draw + correct penalty winner + exact score: 3 points
 * - Predicted draw + correct penalty winner (wrong score): 1 point
 * - Predicted the advancing team to win outright (non-draw): 1 point
 * - Predicted draw + wrong penalty winner: 0 points
 * - Predicted the losing team to win outright: 0 points
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

    if (predictedDraw) {
      // Player predicted a draw — check penalty winner
      const penaltyMatch = predictedPenaltyWinner === actualPenaltyWinner;

      if (!penaltyMatch) {
        // Wrong penalty winner
        return { basePoints: 0, correctResult: false, correctExactScore: false };
      }

      // Predicted draw + correct penalty winner
      const exactScore = predictedHome === actualHome && predictedAway === actualAway;
      if (exactScore) {
        return { basePoints: 3, correctResult: true, correctExactScore: true };
      }
      // Correct result (draw + right penalty winner) but not exact score
      return { basePoints: 1, correctResult: true, correctExactScore: false };
    }

    // Player predicted an outright winner (non-draw) — check if they picked the advancing team
    const predictedWinner = predictedHome > predictedAway ? "home" : "away";
    if (predictedWinner === actualPenaltyWinner) {
      // Correct advancing team predicted via outright win
      return { basePoints: 1, correctResult: true, correctExactScore: false };
    }

    // Predicted the wrong team to win outright
    return { basePoints: 0, correctResult: false, correctExactScore: false };
  }

  // Regular match (group stage, or knockout decided in regular/extra time)
  const exactScore = predictedHome === actualHome && predictedAway === actualAway;
  if (exactScore) {
    return { basePoints: 3, correctResult: true, correctExactScore: true };
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
