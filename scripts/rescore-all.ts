/**
 * One-time rescore script.
 *
 * Re-runs score calculation for every completed match in every group,
 * using the updated team multiplier logic.
 *
 * Safe to run multiple times — scoring uses upsert (idempotent).
 *
 * Usage:
 *   npx tsx scripts/rescore-all.ts
 *
 * Ensure DATABASE_URL is set (or .env is loaded) before running.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Inlined scoring logic (matches src/lib/scoring/) ---

function calculateBasePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  predictedPenaltyWinner?: "home" | "away" | null,
  actualPenaltyWinner?: "home" | "away" | null
): { basePoints: number; correctResult: boolean; correctExactScore: boolean } {
  const isKnockoutPenalties = actualHome === actualAway && actualPenaltyWinner != null;

  if (isKnockoutPenalties) {
    const predictedDraw = predictedHome === predictedAway;
    const penaltyMatch = predictedPenaltyWinner === actualPenaltyWinner;

    if (!predictedDraw || !penaltyMatch) {
      return { basePoints: 0, correctResult: false, correctExactScore: false };
    }

    const exactScore = predictedHome === actualHome && predictedAway === actualAway;
    if (exactScore) {
      return { basePoints: 4, correctResult: true, correctExactScore: true };
    }
    return { basePoints: 1, correctResult: true, correctExactScore: false };
  }

  const exactScore = predictedHome === actualHome && predictedAway === actualAway;
  if (exactScore) {
    return { basePoints: 4, correctResult: true, correctExactScore: true };
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  if (predictedOutcome === actualOutcome) {
    return { basePoints: 1, correctResult: true, correctExactScore: false };
  }

  return { basePoints: 0, correctResult: false, correctExactScore: false };
}

function getOutcome(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function getPredictionOutcome(homeScore: number, awayScore: number): "homeWin" | "awayWin" | "draw" {
  if (homeScore > awayScore) return "homeWin";
  if (awayScore > homeScore) return "awayWin";
  return "draw";
}

function calculateOddsMultipliers(
  homeWinCount: number,
  awayWinCount: number,
  drawCount: number
): { homeWin: number; awayWin: number; draw: number } {
  const total = homeWinCount + awayWinCount + drawCount;
  if (total === 0) return { homeWin: 0, awayWin: 0, draw: 0 };

  const calc = (count: number) => {
    if (count === 0) return 0;
    return Math.round((2 - count / total) * 100) / 100;
  };

  return { homeWin: calc(homeWinCount), awayWin: calc(awayWinCount), draw: calc(drawCount) };
}

function calculateTeamMultiplier(
  homeTeamId: string | null,
  awayTeamId: string | null,
  favoriteTeamId: string | null,
  minnowTeamId: string | null,
  predictedWinnerTeamId: string | null,
  actualWinnerTeamId: string | null
): number {
  if (!homeTeamId || !awayTeamId) return 1;
  if (!favoriteTeamId && !minnowTeamId) return 1;
  if (!predictedWinnerTeamId || !actualWinnerTeamId) return 1;
  if (predictedWinnerTeamId !== actualWinnerTeamId) return 1;

  const winningTeam = actualWinnerTeamId;
  const favoriteQualifies = favoriteTeamId != null && favoriteTeamId === winningTeam;
  const minnowQualifies = minnowTeamId != null && minnowTeamId === winningTeam;

  if (favoriteQualifies && minnowQualifies) return 4;
  if (favoriteQualifies || minnowQualifies) return 2;
  return 1;
}

// --- Main rescore logic ---

async function main() {
  const completedMatches = await prisma.match.findMany({
    where: { status: "completed" },
    orderBy: { kickoffTime: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });

  console.log(`Found ${completedMatches.length} completed match(es) to rescore.\n`);

  if (completedMatches.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const groups = await prisma.group.findMany();
  let totalRescored = 0;
  let totalChanged = 0;

  for (const match of completedMatches) {
    const homeCode = match.homeTeam?.code ?? "TBD";
    const awayCode = match.awayTeam?.code ?? "TBD";
    const score = `${match.homeScore}-${match.awayScore}`;
    const penalty = match.penaltyWinner ? ` (pen: ${match.penaltyWinner})` : "";
    console.log(`Match #${match.matchNumber}: ${homeCode} ${score} ${awayCode}${penalty}`);

    for (const group of groups) {
      const players = await prisma.player.findMany({
        where: { groupId: group.id },
        include: { groupPredictions: true, knockoutPredictions: true },
      });

      if (players.length === 0) continue;

      // Collect predictions for this match
      type PredData = {
        playerId: string;
        homeScore: number;
        awayScore: number;
        penaltyWinner: string | null;
        favoriteTeamId: string | null;
        minnowTeamId: string | null;
      };

      const predictions: PredData[] = [];
      for (const player of players) {
        let pred: { homeScore: number; awayScore: number; penaltyWinner: string | null } | null = null;
        if (match.stage === "group") {
          const gp = player.groupPredictions.find((p) => p.matchId === match.id);
          if (gp) pred = { homeScore: gp.homeScore, awayScore: gp.awayScore, penaltyWinner: null };
        } else {
          const kp = player.knockoutPredictions.find((p) => p.matchId === match.id);
          if (kp) pred = { homeScore: kp.homeScore, awayScore: kp.awayScore, penaltyWinner: kp.penaltyWinner };
        }
        if (pred) {
          predictions.push({
            playerId: player.id,
            ...pred,
            favoriteTeamId: player.favoriteTeamId,
            minnowTeamId: player.minnowTeamId,
          });
        }
      }

      if (predictions.length === 0) continue;

      // Calculate odds multipliers
      let homeWinCount = 0, awayWinCount = 0, drawCount = 0;
      for (const pred of predictions) {
        const outcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
        if (outcome === "homeWin") homeWinCount++;
        else if (outcome === "awayWin") awayWinCount++;
        else drawCount++;
      }
      const oddsMultipliers = calculateOddsMultipliers(homeWinCount, awayWinCount, drawCount);

      const actualHomeScore = match.homeScore!;
      const actualAwayScore = match.awayScore!;
      const penaltyWinner = match.penaltyWinner as "home" | "away" | null;

      let groupChanged = 0;

      for (const pred of predictions) {
        const { basePoints, correctResult, correctExactScore } = calculateBasePoints(
          pred.homeScore, pred.awayScore,
          actualHomeScore, actualAwayScore,
          pred.penaltyWinner as "home" | "away" | null,
          penaltyWinner
        );

        const predictedOutcome = getPredictionOutcome(pred.homeScore, pred.awayScore);
        const oddsMultiplier = oddsMultipliers[predictedOutcome];

        const predictedWinnerTeamId =
          pred.homeScore > pred.awayScore ? match.homeTeamId :
          pred.awayScore > pred.homeScore ? match.awayTeamId :
          null;

        const actualWinnerTeamId =
          actualHomeScore > actualAwayScore ? match.homeTeamId :
          actualAwayScore > actualHomeScore ? match.awayTeamId :
          null;

        const teamMultiplier = calculateTeamMultiplier(
          match.homeTeamId, match.awayTeamId,
          pred.favoriteTeamId, pred.minnowTeamId,
          predictedWinnerTeamId, actualWinnerTeamId
        );

        const totalPoints = Math.round(basePoints * oddsMultiplier * teamMultiplier * 100) / 100;

        // Check if score actually changed
        const existing = await prisma.matchScore.findUnique({
          where: { playerId_matchId: { playerId: pred.playerId, matchId: match.id } },
        });

        const changed = !existing || existing.totalPoints !== totalPoints || existing.teamMultiplier !== teamMultiplier;

        await prisma.matchScore.upsert({
          where: { playerId_matchId: { playerId: pred.playerId, matchId: match.id } },
          create: {
            playerId: pred.playerId,
            matchId: match.id,
            basePoints,
            oddsMultiplier,
            teamMultiplier,
            totalPoints,
            correctResult,
            correctExactScore,
          },
          update: {
            basePoints,
            oddsMultiplier,
            teamMultiplier,
            totalPoints,
            correctResult,
            correctExactScore,
          },
        });

        if (changed) groupChanged++;
        totalRescored++;
      }

      if (groupChanged > 0) {
        console.log(`  → Group "${group.name}": rescored ${predictions.length} player(s), ${groupChanged} score(s) changed`);
        totalChanged += groupChanged;
      }
    }
  }

  console.log(`\nDone. Processed ${totalRescored} player-match score(s). ${totalChanged} score(s) changed.`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
