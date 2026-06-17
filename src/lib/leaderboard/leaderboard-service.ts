import { prisma } from "../db";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  favoriteTeam: string | null;
  minnowTeam: string | null;
  groupStagePoints: number;
  knockoutPoints: number;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
}

/**
 * Get the leaderboard for a group, ordered by:
 * 1. Total points (descending)
 * 2. Exact scores (descending)
 * 3. Correct results (descending)
 * 4. Player name (alphabetical)
 */
export async function getLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const players = await prisma.player.findMany({
    where: { groupId },
    include: {
      favoriteTeam: { select: { name: true, code: true } },
      minnowTeam: { select: { name: true, code: true } },
      matchScores: {
        include: {
          match: {
            select: { stage: true },
          },
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = players.map((player) => {
    const groupStagePoints = player.matchScores
      .filter((s) => s.match.stage === "group")
      .reduce((sum, s) => sum + s.totalPoints, 0);
    const knockoutPoints = player.matchScores
      .filter((s) => s.match.stage === "knockout")
      .reduce((sum, s) => sum + s.totalPoints, 0);
    const totalPoints = groupStagePoints + knockoutPoints;
    const exactScores = player.matchScores.filter((s) => s.correctExactScore).length;
    const correctResults = player.matchScores.filter((s) => s.correctResult && !s.correctExactScore).length;

    return {
      rank: 0,
      playerId: player.id,
      playerName: player.name,
      favoriteTeam: player.favoriteTeam ? player.favoriteTeam.code : null,
      minnowTeam: player.minnowTeam ? player.minnowTeam.code : null,
      groupStagePoints: Math.round(groupStagePoints * 100) / 100,
      knockoutPoints: Math.round(knockoutPoints * 100) / 100,
      totalPoints: Math.round(totalPoints * 100) / 100,
      exactScores,
      correctResults,
    };
  });

  // Sort: total points desc, exact scores desc, correct results desc, name asc
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
    return a.playerName.localeCompare(b.playerName);
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
