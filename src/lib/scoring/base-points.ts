/**
 * Calculate base points for a prediction against an actual result.
 *
 * GROUP STAGE:
 * - Exact score match: 3 points (1 for correct result + 2 for exact score)
 * - Correct result only (win/draw/loss): 1 point
 * - Incorrect: 0 points
 *
 * KNOCKOUT STAGE:
 * Scoring is based on the advancing team, not the scoreline shape.
 * - Correct advancing team: 1 point (regardless of predicted scoreline)
 * - Correct advancing team + exact score: 3 points
 *   - For outright wins: predicted score matches actual score
 *   - For penalty results: predicted score matches AND predicted penalty winner matches
 * - Wrong advancing team: 0 points (even if scoreline matches)
 */
export function calculateBasePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  predictedPenaltyWinner?: "home" | "away" | null,
  actualPenaltyWinner?: "home" | "away" | null,
  isKnockout?: boolean
): { basePoints: number; correctResult: boolean; correctExactScore: boolean } {
  if (isKnockout) {
    return calculateKnockoutBasePoints(
      predictedHome,
      predictedAway,
      actualHome,
      actualAway,
      predictedPenaltyWinner ?? null,
      actualPenaltyWinner ?? null
    );
  }

  // Group stage scoring
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

/**
 * Knockout stage base points calculation.
 *
 * Step 1: Determine actual advancing team
 * Step 2: Determine predicted advancing team
 * Step 3: If wrong team → 0 points
 * Step 4: If right team, check exact score for bonus
 */
function calculateKnockoutBasePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  predictedPenaltyWinner: "home" | "away" | null,
  actualPenaltyWinner: "home" | "away" | null
): { basePoints: number; correctResult: boolean; correctExactScore: boolean } {
  // Determine actual advancing team
  const actualAdvances: "home" | "away" =
    actualHome > actualAway ? "home" :
    actualAway > actualHome ? "away" :
    actualPenaltyWinner!; // Must be set for completed knockout matches with equal scores

  // Determine predicted advancing team
  const predictedAdvances: "home" | "away" =
    predictedHome > predictedAway ? "home" :
    predictedAway > predictedHome ? "away" :
    predictedPenaltyWinner!; // Must be set for knockout predictions with equal scores

  // Wrong advancing team = always 0 points
  if (predictedAdvances !== actualAdvances) {
    return { basePoints: 0, correctResult: false, correctExactScore: false };
  }

  // Correct advancing team — check for exact score
  const scoresMatch = predictedHome === actualHome && predictedAway === actualAway;

  if (scoresMatch) {
    // If actual result was decided by penalties, penalty winner must also match for exact score
    const actualWasPenalties = actualHome === actualAway && actualPenaltyWinner != null;

    if (actualWasPenalties) {
      if (predictedPenaltyWinner === actualPenaltyWinner) {
        // Exact drawn score + correct penalty winner
        return { basePoints: 3, correctResult: true, correctExactScore: true };
      }
      // Scores match but different penalty winner — still right team, just not exact
      // (This case: e.g., predicted 1-1 home pens, actual 1-1 home pens — would already match above)
      // (Edge case: predicted 1-1 away outright is impossible since 1-1 is always a draw)
      // Right team via different method, correct score but wrong penalty pick
      return { basePoints: 1, correctResult: true, correctExactScore: false };
    }

    // Outright win with exact score match
    return { basePoints: 3, correctResult: true, correctExactScore: true };
  }

  // Correct advancing team, wrong score
  return { basePoints: 1, correctResult: true, correctExactScore: false };
}

type Outcome = "home" | "away" | "draw";

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}
