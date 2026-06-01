import { prisma } from "../db";
import { isPredictionOpen } from "../utils/time";
import type { PenaltyWinner, PredictionResult } from "../types";

/**
 * Submit or update a knockout stage prediction.
 */
export async function submitKnockoutPrediction(
  playerId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  penaltyWinner?: PenaltyWinner | null
): Promise<PredictionResult> {
  // Validate scores
  if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
    return { success: false, message: "Scores must be integers between 0 and 20." };
  }

  // Validate penalty winner
  if (homeScore === awayScore) {
    if (!penaltyWinner || (penaltyWinner !== "home" && penaltyWinner !== "away")) {
      return {
        success: false,
        message: "Penalty winner selection is required when scores are equal.",
      };
    }
  } else {
    // Clear penalty winner if scores are unequal
    penaltyWinner = null;
  }

  // Get match and check stage
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { success: false, message: "Match not found." };
  if (match.stage !== "knockout") return { success: false, message: "This is not a knockout stage match." };

  // Check teams are confirmed
  if (!match.homeTeamId || !match.awayTeamId) {
    return { success: false, message: "Teams have not been confirmed for this match yet." };
  }

  // Check deadline
  if (!isPredictionOpen(match.kickoffTime)) {
    return { success: false, message: "Predictions are closed for this match." };
  }

  // Upsert prediction
  await prisma.knockoutPrediction.upsert({
    where: { playerId_matchId: { playerId, matchId } },
    create: { playerId, matchId, homeScore, awayScore, penaltyWinner },
    update: { homeScore, awayScore, penaltyWinner },
  });

  return { success: true, message: "Prediction saved." };
}

export async function getKnockoutPrediction(playerId: string, matchId: string) {
  return prisma.knockoutPrediction.findUnique({
    where: { playerId_matchId: { playerId, matchId } },
  });
}

export async function getKnockoutPredictionsForMatch(matchId: string) {
  return prisma.knockoutPrediction.findMany({ where: { matchId } });
}

function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 20;
}
