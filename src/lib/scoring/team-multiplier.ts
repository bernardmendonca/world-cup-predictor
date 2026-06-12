/**
 * Calculate the team multiplier for a player's prediction on a match.
 *
 * Rules:
 * - The multiplier only applies if the player predicted their selected team to win
 *   AND that team actually won the match.
 * - No qualifying team: 1
 * - One qualifying team (favorite XOR minnow predicted to win and won): 2
 * - Both qualifying (same team is both favorite AND minnow, predicted to win and won): 4
 * - Both qualifying (favorite predicted to win and won, minnow predicted to win and won — only possible if they are the same team): 4
 *
 * "Predicted to win" means the player's predicted score has that team winning.
 * "Actually won" means the actual result has that team winning.
 * Draws do not qualify for the team multiplier.
 */
export function calculateTeamMultiplier(
  homeTeamId: string | null,
  awayTeamId: string | null,
  favoriteTeamId: string | null,
  minnowTeamId: string | null,
  predictedWinnerTeamId: string | null,
  actualWinnerTeamId: string | null
): number {
  if (!homeTeamId || !awayTeamId) return 1;
  if (!favoriteTeamId && !minnowTeamId) return 1;
  // If no predicted winner (draw) or no actual winner (draw), multiplier is 1
  if (!predictedWinnerTeamId || !actualWinnerTeamId) return 1;

  // The multiplier only applies if the predicted winner matches the actual winner
  if (predictedWinnerTeamId !== actualWinnerTeamId) return 1;

  const winningTeam = actualWinnerTeamId;

  const favoriteQualifies = favoriteTeamId != null && favoriteTeamId === winningTeam;
  const minnowQualifies = minnowTeamId != null && minnowTeamId === winningTeam;

  if (favoriteQualifies && minnowQualifies) {
    // Same team is both favorite and minnow, and that team won as predicted
    return 4;
  }

  if (favoriteQualifies || minnowQualifies) {
    return 2;
  }

  return 1;
}
