/**
 * Calculate the team multiplier for a player's prediction on a match.
 *
 * Rules:
 * - No team match: 1
 * - One team is favorite XOR minnow (not both): 2
 * - Same team is both favorite AND minnow: 4
 * - One team is favorite, other is minnow: 4
 */
export function calculateTeamMultiplier(
  homeTeamId: string | null,
  awayTeamId: string | null,
  favoriteTeamId: string | null,
  minnowTeamId: string | null
): number {
  if (!homeTeamId || !awayTeamId) return 1;
  if (!favoriteTeamId && !minnowTeamId) return 1;

  const teamsInMatch = [homeTeamId, awayTeamId];

  const favoriteInMatch = favoriteTeamId != null && teamsInMatch.includes(favoriteTeamId);
  const minnowInMatch = minnowTeamId != null && teamsInMatch.includes(minnowTeamId);

  if (favoriteInMatch && minnowInMatch) {
    // Both favorite and minnow are involved (could be same team or different teams in the match)
    return 4;
  }

  if (favoriteInMatch || minnowInMatch) {
    return 2;
  }

  return 1;
}
