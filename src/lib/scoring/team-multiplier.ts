/**
 * Calculate the team multiplier for a player's prediction on a match.
 *
 * Rules:
 * The multiplier applies in two scenarios:
 *
 * 1. WIN: The player predicted their selected team to win AND that team actually won.
 * 2. DRAW: The player's selected team is playing in the match AND the player predicted
 *    a draw AND the match actually ended in a draw.
 *
 * Multiplier values:
 * - No qualifying team: 1
 * - One qualifying team (favorite XOR minnow): 2
 * - Both qualifying (same team is both favorite AND minnow): 4
 */
export function calculateTeamMultiplier(
  homeTeamId: string | null,
  awayTeamId: string | null,
  favoriteTeamId: string | null,
  minnowTeamId: string | null,
  predictedWinnerTeamId: string | null,
  actualWinnerTeamId: string | null,
  predictedDraw: boolean,
  actualDraw: boolean
): number {
  if (!homeTeamId || !awayTeamId) return 1;
  if (!favoriteTeamId && !minnowTeamId) return 1;

  const teamsInMatch = [homeTeamId, awayTeamId];

  // Scenario 2: Draw — both predicted and actual result are draws
  if (predictedDraw && actualDraw) {
    const favoriteInMatch = favoriteTeamId != null && teamsInMatch.includes(favoriteTeamId);
    const minnowInMatch = minnowTeamId != null && teamsInMatch.includes(minnowTeamId);

    if (favoriteInMatch && minnowInMatch) return 4;
    if (favoriteInMatch || minnowInMatch) return 2;
    return 1;
  }

  // Scenario 1: Win — predicted winner matches actual winner
  if (!predictedWinnerTeamId || !actualWinnerTeamId) return 1;
  if (predictedWinnerTeamId !== actualWinnerTeamId) return 1;

  const winningTeam = actualWinnerTeamId;

  const favoriteQualifies = favoriteTeamId != null && favoriteTeamId === winningTeam;
  const minnowQualifies = minnowTeamId != null && minnowTeamId === winningTeam;

  if (favoriteQualifies && minnowQualifies) return 4;
  if (favoriteQualifies || minnowQualifies) return 2;

  return 1;
}
