import { prisma } from "../db";
import { getCurrentTime } from "../utils/time";
import type { PredictionResult, TeamSelections } from "../types";

/**
 * Get the team selection deadline: 2 hours before the first match of the tournament.
 */
async function getTeamSelectionDeadline(): Promise<Date> {
  const firstMatch = await prisma.match.findFirst({
    orderBy: { kickoffTime: "asc" },
  });
  if (!firstMatch) throw new Error("No matches found in database.");
  return new Date(firstMatch.kickoffTime.getTime() - 2 * 60 * 60 * 1000);
}

export async function isTeamSelectionOpen(): Promise<boolean> {
  const deadline = await getTeamSelectionDeadline();
  return getCurrentTime() < deadline;
}

export async function selectFavoriteTeam(
  playerId: string,
  teamId: string
): Promise<PredictionResult> {
  if (!(await isTeamSelectionOpen())) {
    return { success: false, message: "Team selection window has closed." };
  }

  // Verify team exists
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { success: false, message: "Team not found." };

  await prisma.player.update({
    where: { id: playerId },
    data: { favoriteTeamId: teamId },
  });

  return { success: true, message: `Favorite team set to ${team.name}.` };
}

export async function selectMinnowTeam(
  playerId: string,
  teamId: string
): Promise<PredictionResult> {
  if (!(await isTeamSelectionOpen())) {
    return { success: false, message: "Team selection window has closed." };
  }

  // Verify team exists
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { success: false, message: "Team not found." };

  await prisma.player.update({
    where: { id: playerId },
    data: { minnowTeamId: teamId },
  });

  return { success: true, message: `Minnow team set to ${team.name}.` };
}

export async function getPlayerSelections(playerId: string): Promise<TeamSelections> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { favoriteTeamId: true, minnowTeamId: true },
  });
  return {
    favoriteTeamId: player?.favoriteTeamId ?? null,
    minnowTeamId: player?.minnowTeamId ?? null,
  };
}
