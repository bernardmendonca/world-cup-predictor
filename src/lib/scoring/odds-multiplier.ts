import type { OddsMultipliers } from "../types";

/**
 * Calculate odds multipliers based on prediction distribution.
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

function calculateSingleMultiplier(count: number, total: number): number {
  if (count === 0) return 0;
  const multiplier = 2 - count / total;
  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
}

/**
 * Determine which outcome a prediction represents.
 */
export function getPredictionOutcome(
  homeScore: number,
  awayScore: number
): "homeWin" | "awayWin" | "draw" {
  if (homeScore > awayScore) return "homeWin";
  if (awayScore > homeScore) return "awayWin";
  return "draw";
}
