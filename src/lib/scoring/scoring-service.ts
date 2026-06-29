import { prisma } from "../db";
import { calculateBasePoints } from "./base-points";
import { calculateOddsMultipliers, calculateKnockoutOddsMultipliers, getPredictionOutcome, getKnockoutPredictionOutcome } from "./odds-multiplier";
import { calculateTeamMultiplier } from "./team-multiplier";
import type { MatchScoreResult, OddsMultipliers, KnockoutOddsMultipliers, PenaltyWinner } from "../types";

/**
 * Calculate and store scores for all players in a group for a given match.
 * Works for both group stage and knockout stage matches.
 */
export async function calculateMatchScores(
  groupId: string,
  matchId: string,
  actualHomeScore: number,
  actualAwayScore: number,
  penaltyWinner?: PenaltyWinner | null
): Promise<MatchScoreResult[]> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) throw new Error(`Match not found: ${matchId}`);

  const isKnockout = match.stage === "knockout";

  // Get all predictions for this match from players in this group
  const players = await prisma.player.findMany({
    where: { groupId },
    include: { groupPredictions: true, knockoutPredictions: true },
  });

  // Collect predictions for this match
  type PredictionData = {
    playerId: string;
    homeScore: number;
    awayScore: number;
    penaltyWinner: string | null;
    favoriteTeamId: string | null;
    minnowTeamId: string | null;
  };

  const predictions: PredictionData[] = [];

  for (const player of players) {
    let prediction: { homeScore: number; awayScore: number; penaltyWinner: string | null } | null = null;

    if (match.stage === "group") {
      const gp = player.groupPredictions.find((p) => p.matchId === matchId);
      if (gp) prediction = { homeScore: gp.homeScore, awayScore: gp.awayScore, penaltyWinner: null };
    } else {
      const kp = player.knockoutPredictions.find((p) => p.matchId === matchId);
      if (kp) prediction = { homeScore: kp.homeScore, awayScore: kp.awayScore, penaltyWinner: kp.penaltyWinner };
    }

    if (prediction) {
      predictions.push({
        playerId: player.id,
        ...prediction,
        favoriteTeamId: player.favoriteTeamId,
        minnowTeamId: player.minnowTeamId,
      });
    }
  }

  // Calculate odds multipliers from prediction distribution
  let oddsMultiplierLookup: (pred: PredictionData) => number;

  if (isKnockout) {
    // Knockout: 2-outcome system based on predicted advancing team
    let homeAdvancesCount = 0;
    let awayAdvancesCount = 0;

    for (const pred of predictions) {
      const outcome = getKnockoutPredictionOutcome(
        pred.homeScore,
        pred.awayScore,
        pred.penaltyWinner as PenaltyWinner | null
      );
      if (outcome === "homeAdvances") homeAdvancesCount++;
      else awayAdvancesCount++;
    }

    const knockoutOdds = calculateKnockoutOddsMultipliers(homeAdvancesCount, awayAdvancesCount);

    oddsMultiplierLookup = (pred: PredictionData) => {
      const outcome = getKnockoutPredictionOutcome(
        pred.homeScore,
        pred.awayScore,
        pred.penaltyWinner as PenaltyWinner | null
      );
      return knockoutOdds[outcome];
    };
  } else {
    // Group stage: 3-outcome system
    let homeWinCount = 0;
    let awayWinCount = 0;
    let drawCount = 0;

    for (const pred of predictions) {
      const outcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
      if (outcome === "homeWin") homeWinCount++;
      else if (outcome === "awayWin") awayWinCount++;
      else drawCount++;
    }

    const groupOdds = calculateOddsMultipliers(homeWinCount, awayWinCount, drawCount);

    oddsMultiplierLookup = (pred: PredictionData) => {
      const outcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
      return groupOdds[outcome];
    };
  }

  // Calculate scores for each player
  const results: MatchScoreResult[] = [];

  for (const pred of predictions) {
    const { basePoints, correctResult, correctExactScore } = calculateBasePoints(
      pred.homeScore,
      pred.awayScore,
      actualHomeScore,
      actualAwayScore,
      pred.penaltyWinner as PenaltyWinner | null,
      penaltyWinner
    );

    // Get the odds multiplier for this player's predicted outcome
    const oddsMultiplier = oddsMultiplierLookup(pred);

    // Derive predicted winner and actual winner team IDs
    const predictedWinnerTeamId =
      pred.homeScore > pred.awayScore ? match.homeTeamId :
      pred.awayScore > pred.homeScore ? match.awayTeamId :
      null; // draw — no winner

    // For knockout penalty matches, the advancing team is the "winner" for team multiplier purposes
    const isKnockoutPenalties = actualHomeScore === actualAwayScore && penaltyWinner != null;
    const actualWinnerTeamId =
      actualHomeScore > actualAwayScore ? match.homeTeamId :
      actualAwayScore > actualHomeScore ? match.awayTeamId :
      isKnockoutPenalties ? (penaltyWinner === "home" ? match.homeTeamId : match.awayTeamId) :
      null; // draw — no winner

    const predictedDraw = pred.homeScore === pred.awayScore;
    const actualDraw = actualHomeScore === actualAwayScore;

    // Get team multiplier (only applies if predicted team won and actually won, OR both predicted and actual are draws)
    const teamMultiplier = calculateTeamMultiplier(
      match.homeTeamId,
      match.awayTeamId,
      pred.favoriteTeamId,
      pred.minnowTeamId,
      predictedWinnerTeamId,
      actualWinnerTeamId,
      predictedDraw,
      actualDraw
    );

    // Final score: base × odds × team, rounded to 2dp
    const totalPoints = Math.round(basePoints * oddsMultiplier * teamMultiplier * 100) / 100;

    results.push({
      playerId: pred.playerId,
      matchId,
      basePoints,
      oddsMultiplier,
      teamMultiplier,
      totalPoints,
      correctResult,
      correctExactScore,
    });
  }

  // Store results (upsert for idempotency)
  for (const result of results) {
    await prisma.matchScore.upsert({
      where: {
        playerId_matchId: { playerId: result.playerId, matchId: result.matchId },
      },
      create: result,
      update: result,
    });
  }

  return results;
}

/**
 * Get odds multipliers for a match (after deadline).
 * Returns OddsMultipliers (3-outcome) for group stage,
 * or KnockoutOddsMultipliers (2-outcome) for knockout stage.
 */
export async function getOddsMultipliers(
  groupId: string,
  matchId: string
): Promise<OddsMultipliers | KnockoutOddsMultipliers> {
  const players = await prisma.player.findMany({
    where: { groupId },
    include: { groupPredictions: true, knockoutPredictions: true },
  });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error(`Match not found: ${matchId}`);

  if (match.stage === "knockout") {
    let homeAdvancesCount = 0;
    let awayAdvancesCount = 0;

    for (const player of players) {
      const kp = player.knockoutPredictions.find((p) => p.matchId === matchId);
      if (kp) {
        const outcome = getKnockoutPredictionOutcome(
          kp.homeScore,
          kp.awayScore,
          kp.penaltyWinner as PenaltyWinner | null
        );
        if (outcome === "homeAdvances") homeAdvancesCount++;
        else awayAdvancesCount++;
      }
    }

    return calculateKnockoutOddsMultipliers(homeAdvancesCount, awayAdvancesCount);
  } else {
    let homeWinCount = 0;
    let awayWinCount = 0;
    let drawCount = 0;

    for (const player of players) {
      const gp = player.groupPredictions.find((p) => p.matchId === matchId);
      if (gp) {
        const outcome = getPredictionOutcome(gp.homeScore, gp.awayScore);
        if (outcome === "homeWin") homeWinCount++;
        else if (outcome === "awayWin") awayWinCount++;
        else drawCount++;
      }
    }

    return calculateOddsMultipliers(homeWinCount, awayWinCount, drawCount);
  }
}
