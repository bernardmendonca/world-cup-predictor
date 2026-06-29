import type { OddsMultipliers, KnockoutOddsMultipliers } from "../types";

/**
 * Calculate odds multipliers for group stage based on prediction distribution.
 *
 * Formula: 2 - (predictionsForOutcome / totalPredictions)
 * Range: [1.00, 2.00] for outcomes with predictions, 0 for outcomes with no predictions.
 *
 * If only one player predicted, their outcome gets 1.00.
 */
export function calculateOddsMultipliers(
  homeWinCount: number,
  awayWinCount: number,
  drawCount: number
): OddsMultipliers {
  const total = homeWinCount + awayWinCount + drawCount;

  if (total === 0) {
    return { homeWin: 0, awayWin: 0, draw: 0 };
  }

  return {
    homeWin: calculateSingleMultiplier(homeWinCount, total),
    awayWin: calculateSingleMultiplier(awayWinCount, total),
    draw: calculateSingleMultiplier(drawCount, total),
  };
}

/**
 * Calculate odds multipliers for knockout stage based on predicted advancing team.
 *
 * In knockout, there are only 2 outcomes: home team advances or away team advances.
 * A prediction of equal scores with penaltyWinner="home" counts as home advances,
 * just like a prediction of 2-1. Similarly for away.
 *
 * Formula: 2 - (predictionsForOutcome / totalPredictions)
 * Range: [1.00, 2.00] for outcomes with predictions, 0 for outcomes with no predictions.
 */
export function calculateKnockoutOddsMultipliers(
  homeAdvancesCount: number,
  awayAdvancesCount: number
): KnockoutOddsMultipliers {
  const total = homeAdvancesCount + awayAdvancesCount;

  if (total === 0) {
    return { homeAdvances: 0, awayAdvances: 0 };
  }

  return {
    homeAdvances: calculateSingleMultiplier(homeAdvancesCount, total),
    awayAdvances: calculateSingleMultiplier(awayAdvancesCount, total),
  };
}

function calculateSingleMultiplier(count: number, total: number): number {
  if (count === 0) return 0;
  const multiplier = 2 - count / total;
  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
}

/**
 * Determine which outcome a group stage prediction represents.
 */
export function getPredictionOutcome(
  homeScore: number,
  awayScore: number
): "homeWin" | "awayWin" | "draw" {
  if (homeScore > awayScore) return "homeWin";
  if (awayScore > homeScore) return "awayWin";
  return "draw";
}

/**
 * Determine which team advances in a knockout prediction.
 * If scores are equal, the penaltyWinner determines the advancing team.
 * If scores are unequal, the team with the higher score advances.
 */
export function getKnockoutPredictionOutcome(
  homeScore: number,
  awayScore: number,
  penaltyWinner: "home" | "away" | null
): "homeAdvances" | "awayAdvances" {
  if (homeScore > awayScore) return "homeAdvances";
  if (awayScore > homeScore) return "awayAdvances";
  // Equal scores — use penalty winner
  return penaltyWinner === "away" ? "awayAdvances" : "homeAdvances";
}
