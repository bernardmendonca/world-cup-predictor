import { prisma } from "../db";
import type { LeaderboardEntry } from "../types";

/**
 * Get the leaderboard for a group, ordered by:
 * 1. Total points (descending)
 * 2. Number of correct exact scores (descending)
 * 3. Player name (alphabetical)
 */
export async function getLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const players = await prisma.player.findMany({
    where: { groupId },
    include: {
      matchScores: true,
    },
  });

  const entries: LeaderboardEntry[] = players.map((player) => {
    const totalPoints = player.matchScores.reduce((sum, s) => sum + s.totalPoints, 0);
    const correctPredictions = player.matchScores.filter(
      (s) => s.correctResult || s.correctExactScore
    ).length;
    const exactScores = player.matchScores.filter((s) => s.correctExactScore).length;

    return {
      rank: 0,
      playerId: player.id,
      playerName: player.name,
      totalPoints: Math.round(totalPoints * 100) / 100,
      correctPredictions,
      exactScores,
    };
  });

  // Sort: points desc, exact scores desc, name asc
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return a.playerName.localeCompare(b.playerName);
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
