import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { resolveGroup } from "@/lib/groups/group-service";
import { isPredictionOpen } from "@/lib/utils/time";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";
import { notFound } from "next/navigation";
import { PredictClient } from "./predict-client";
import type { MatchData } from "./batch-prediction-form";
import { getPlayerSelections, isTeamSelectionOpen } from "@/lib/predictions/team-selection";
import { findNextUpcomingMatchId } from "@/lib/utils/next-upcoming-match";

export default async function PredictPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ time?: string; stage?: string; round?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  let group;
  try {
    group = await resolveGroup(resolvedParams.groupSlug);
  } catch {
    notFound();
  }

  const player = await getCurrentPlayer(resolvedParams.groupSlug);
  if (!player) {
    return <div className="text-center py-8 text-gray-500">Please log in to make predictions.</div>;
  }

  // Fetch team selection data
  const teams = await prisma.team.findMany({
    orderBy: [{ groupLetter: "asc" }, { fifaRanking: "asc" }],
  });
  const selections = await getPlayerSelections(player.id);
  const selectionOpen = await isTeamSelectionOpen();

  const stageFilter = resolvedSearchParams.stage || null; // null = all
  const roundFilter = resolvedSearchParams.round;

  // Build query
  const where: Record<string, unknown> = {};
  if (stageFilter) {
    where.stage = stageFilter;
  }
  if (roundFilter) {
    where.knockoutRound = roundFilter;
  }

  const matches = await prisma.match.findMany({
    where,
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  // Get existing predictions for this player
  const groupPredictions = await prisma.groupPrediction.findMany({
    where: { playerId: player.id, matchId: { in: matches.map((m) => m.id) } },
  });
  const knockoutPredictions = await prisma.knockoutPrediction.findMany({
    where: { playerId: player.id, matchId: { in: matches.map((m) => m.id) } },
  });

  // Build match data for the client component
  const completedMatchIds = matches.filter((m) => m.status === "completed").map((m) => m.id);
  const matchScores = completedMatchIds.length > 0
    ? await prisma.matchScore.findMany({
        where: { matchId: { in: completedMatchIds }, playerId: player.id },
      })
    : [];

  // Map player's score by matchId
  const playerScoreByMatch: Record<string, { totalPoints: number; basePoints: number; oddsMultiplier: number; teamMultiplier: number }> = {};
  for (const score of matchScores) {
    playerScoreByMatch[score.matchId] = {
      totalPoints: score.totalPoints,
      basePoints: score.basePoints,
      oddsMultiplier: score.oddsMultiplier,
      teamMultiplier: score.teamMultiplier,
    };
  }

  const matchData = matches.map((match) => {
    const gp = groupPredictions.find((p) => p.matchId === match.id);
    const kp = knockoutPredictions.find((p) => p.matchId === match.id);
    const prediction = gp || kp;

    return {
      id: match.id,
      matchNumber: match.matchNumber,
      homeTeamName: match.homeTeam?.name || match.homeSlotLabel || "TBD",
      awayTeamName: match.awayTeam?.name || match.awaySlotLabel || "TBD",
      homeTeamCode: match.homeTeam?.code || null,
      awayTeamCode: match.awayTeam?.code || null,
      stage: match.stage,
      knockoutRound: match.knockoutRound,
      groupLetter: match.groupLetter,
      venue: match.venue,
      kickoffTime: match.kickoffTime.toISOString(),
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      teamsConfirmed: match.homeTeamId != null && match.awayTeamId != null,
      predictionOpen: isPredictionOpen(match.kickoffTime),
      existingPrediction: prediction
        ? {
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            penaltyWinner: "penaltyWinner" in prediction ? prediction.penaltyWinner : null,
          }
        : null,
      participantScores: playerScoreByMatch[match.id] || null,
    };
  }) as MatchData[];

  const predictableCount = matchData.filter((m) => m.teamsConfirmed).length;
  const predictedCount = matchData.filter((m) => m.existingPrediction !== null).length;
  const nextUpcomingMatchId = findNextUpcomingMatchId(matchData);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Predictions</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <a
          href={`/${resolvedParams.groupSlug}/predict`}
          className={`px-3 py-1 rounded text-sm ${!stageFilter && !roundFilter ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          All
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=group`}
          className={`px-3 py-1 rounded text-sm ${stageFilter === "group" && !roundFilter ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Group Stage
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=round_of_32`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "round_of_32" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Round of 32
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=round_of_16`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "round_of_16" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Round of 16
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=quarter_finals`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "quarter_finals" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          QF
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=semi_finals`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "semi_finals" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          SF
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=third_place`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "third_place" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          3rd
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/predict?stage=knockout&round=final`}
          className={`px-3 py-1 rounded text-sm ${roundFilter === "final" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Final
        </a>
      </div>

      <PredictClient
        teams={teams.map((t) => ({ id: t.id, name: t.name, code: t.code, fifaRanking: t.fifaRanking, groupLetter: t.groupLetter }))}
        selections={selections}
        selectionOpen={selectionOpen}
        groupSlug={resolvedParams.groupSlug}
        matches={matchData}
        predictableCount={predictableCount}
        predictedCount={predictedCount}
        nextUpcomingMatchId={nextUpcomingMatchId}
      />
    </div>
  );
}
