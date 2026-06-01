import { prisma } from "../db";
import { isPredictionOpen } from "../utils/time";
import type { PredictionResult } from "../types";

/**
 * Submit or update a group stage prediction.
 */
export async function submitGroupPrediction(
  playerId: string,
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<PredictionResult> {
  // Validate scores
  if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
    return { success: false, message: "Scores must be integers between 0 and 20." };
  }

  // Get match and check stage
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { success: false, message: "Match not found." };
  if (match.stage !== "group") return { success: false, message: "This is not a group stage match." };

  // Check deadline
  if (!isPredictionOpen(match.kickoffTime)) {
    return { success: false, message: "Predictions are closed for this match." };
  }

  // Upsert prediction
  await prisma.groupPrediction.upsert({
    where: { playerId_matchId: { playerId, matchId } },
    create: { playerId, matchId, homeScore, awayScore },
    update: { homeScore, awayScore },
  });

  return { success: true, message: "Prediction saved." };
}

export async function getGroupPrediction(playerId: string, matchId: string) {
  return prisma.groupPrediction.findUnique({
    where: { playerId_matchId: { playerId, matchId } },
  });
}

export async function getGroupPredictionsForMatch(matchId: string) {
  return prisma.groupPrediction.findMany({ where: { matchId } });
}

function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 20;
}
