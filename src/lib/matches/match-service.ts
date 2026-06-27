import { prisma } from "../db";
import { getCurrentTime, getPredictionDeadline } from "../utils/time";
import type { MatchStatus, KnockoutRound, PenaltyWinner } from "../types";

export async function getAllMatches() {
  return prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });
}

export async function getMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
}

export async function getMatchesByStage(stage: "group" | "knockout") {
  return prisma.match.findMany({
    where: { stage },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });
}

export async function getMatchesByRound(round: KnockoutRound) {
  return prisma.match.findMany({
    where: { knockoutRound: round },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });
}

/**
 * Record a match result. For knockout matches with equal scores, penaltyWinner is required.
 */
export async function recordResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  penaltyWinner?: PenaltyWinner | null
) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error(`Match not found: ${matchId}`);

  if (match.stage === "knockout" && homeScore === awayScore && !penaltyWinner) {
    throw new Error("Penalty winner is required for knockout matches with equal scores.");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      penaltyWinner: homeScore === awayScore ? penaltyWinner : null,
      status: "completed",
    },
  });
}

/**
 * Assign teams to a knockout match slot.
 * Supports partial assignment — either team can be set or cleared independently.
 */
export async function assignKnockoutTeams(
  matchId: string,
  homeTeamId: string | null,
  awayTeamId: string | null
) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error(`Match not found: ${matchId}`);
  if (match.stage !== "knockout") throw new Error("Can only assign teams to knockout matches.");

  await prisma.match.update({
    where: { id: matchId },
    data: { homeTeamId: homeTeamId || null, awayTeamId: awayTeamId || null },
  });
}

/**
 * Check if a match is ready for predictions (both teams confirmed).
 */
export function isMatchReadyForPredictions(match: { homeTeamId: string | null; awayTeamId: string | null }): boolean {
  return match.homeTeamId != null && match.awayTeamId != null;
}

/**
 * Derive match status from kickoff time and result.
 */
export function deriveMatchStatus(
  kickoffTime: Date,
  homeScore: number | null,
  awayScore: number | null
): MatchStatus {
  if (homeScore != null && awayScore != null) return "completed";
  if (getCurrentTime() >= kickoffTime) return "in_progress";
  return "upcoming";
}
