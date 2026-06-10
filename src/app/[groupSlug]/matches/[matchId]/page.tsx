import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatTimeZones } from "@/lib/utils/timezone";
import { isPredictionOpen } from "@/lib/utils/time";
import { getOddsMultipliers } from "@/lib/scoring/scoring-service";
import { resolveGroup } from "@/lib/groups/group-service";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; matchId: string }>;
  searchParams: Promise<{ time?: string }>;
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

  const match = await prisma.match.findUnique({
    where: { id: resolvedParams.matchId },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) notFound();

  const tz = formatTimeZones(match.kickoffTime);
  const predictionsClosed = !isPredictionOpen(match.kickoffTime);
  const isCompleted = match.status === "completed";

  // Get predictions only after deadline
  let predictions: Array<{
    playerId: string;
    playerName: string;
    homeScore: number;
    awayScore: number;
    penaltyWinner?: string | null;
  }> = [];

  let oddsMultipliers: { homeWin: number; awayWin: number; draw: number } | null = null;

  if (predictionsClosed) {
    if (match.stage === "group") {
      const gps = await prisma.groupPrediction.findMany({
        where: { matchId: match.id, player: { groupId: group.id } },
        include: { player: true },
      });
      predictions = gps.map((gp) => ({
        playerId: gp.player.id,
        playerName: gp.player.name,
        homeScore: gp.homeScore,
        awayScore: gp.awayScore,
      }));
    } else {
      const kps = await prisma.knockoutPrediction.findMany({
        where: { matchId: match.id, player: { groupId: group.id } },
        include: { player: true },
      });
      predictions = kps.map((kp) => ({
        playerId: kp.player.id,
        playerName: kp.player.name,
        homeScore: kp.homeScore,
        awayScore: kp.awayScore,
        penaltyWinner: kp.penaltyWinner,
      }));
    }

    // Show odds multipliers after deadline
    try {
      oddsMultipliers = await getOddsMultipliers(group.id, match.id);
    } catch {
      // No predictions yet
    }
  }

  // Get scores if match is completed
  const scores = isCompleted
    ? await prisma.matchScore.findMany({
        where: { matchId: match.id, player: { groupId: group.id } },
        include: { player: true },
        orderBy: { totalPoints: "desc" },
      })
    : [];

  // Get all players in group (for showing "No prediction" entries in comparison)
  const allGroupPlayers = isCompleted
    ? await prisma.player.findMany({
        where: { groupId: group.id },
        select: { id: true, name: true },
      })
    : [];

  // Build comparison data for completed matches
  type ComparisonEntry = {
    playerName: string;
    homeScore: number | null;
    awayScore: number | null;
    penaltyWinner?: string | null;
    accuracy: "exact" | "result" | "wrong" | "none";
    totalPoints: number;
    basePoints: number;
    oddsMultiplier: number;
    teamMultiplier: number;
  };

  let comparisonData: ComparisonEntry[] = [];

  if (isCompleted && match.homeScore !== null && match.awayScore !== null) {
    const actualHome = match.homeScore;
    const actualAway = match.awayScore;

    comparisonData = allGroupPlayers.map((player) => {
      const prediction = predictions.find((p) => p.playerId === player.id);
      const score = scores.find((s) => s.player.id === player.id);

      if (!prediction) {
        return {
          playerName: player.name,
          homeScore: null,
          awayScore: null,
          accuracy: "none" as const,
          totalPoints: 0,
          basePoints: 0,
          oddsMultiplier: 0,
          teamMultiplier: 0,
        };
      }

      let accuracy: "exact" | "result" | "wrong" = "wrong";
      if (score?.correctExactScore) {
        accuracy = "exact";
      } else if (score?.correctResult) {
        accuracy = "result";
      }

      return {
        playerName: player.name,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        penaltyWinner: prediction.penaltyWinner,
        accuracy,
        totalPoints: score?.totalPoints ?? 0,
        basePoints: score?.basePoints ?? 0,
        oddsMultiplier: score?.oddsMultiplier ?? 0,
        teamMultiplier: score?.teamMultiplier ?? 0,
      };
    });

    // Sort: exact first, then result, then wrong, then none. Within each group, by points desc.
    const accuracyOrder = { exact: 0, result: 1, wrong: 2, none: 3 };
    comparisonData.sort((a, b) => {
      if (accuracyOrder[a.accuracy] !== accuracyOrder[b.accuracy]) {
        return accuracyOrder[a.accuracy] - accuracyOrder[b.accuracy];
      }
      return b.totalPoints - a.totalPoints;
    });
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/${resolvedParams.groupSlug}/matches`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to matches
        </a>
      </div>

      {/* Match header */}
      <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Match #{match.matchNumber} ·{" "}
            {match.stage === "group"
              ? `Group ${match.groupLetter}`
              : match.knockoutRound}
          </div>
          <div className="text-2xl font-bold mb-2">
            <span>{match.homeTeam?.name || match.homeSlotLabel || "TBD"}</span>
            <span className="mx-4 text-gray-400 dark:text-gray-500">
              {match.status === "completed"
                ? `${match.homeScore} - ${match.awayScore}`
                : "vs"}
            </span>
            <span>{match.awayTeam?.name || match.awaySlotLabel || "TBD"}</span>
          </div>
          {match.penaltyWinner && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Penalties: {match.penaltyWinner === "home" ? match.homeTeam?.name : match.awayTeam?.name} wins
            </div>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{match.venue}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 space-x-4">
            <span>🇺🇸 {tz.eastern}</span>
            <span>🇬🇧 {tz.uk}</span>
            <span>🇮🇳 {tz.ist}</span>
          </div>
          {isCompleted && (
            <div className="mt-3">
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full font-medium">
                ✓ Completed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Odds Multipliers */}
      {predictionsClosed && oddsMultipliers ? (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h2 className="font-semibold mb-2">Odds Multipliers</h2>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Home Win</div>
              <div className="font-bold text-lg">{oddsMultipliers.homeWin.toFixed(2)}x</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Draw</div>
              <div className="font-bold text-lg">{oddsMultipliers.draw.toFixed(2)}x</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Away Win</div>
              <div className="font-bold text-lg">{oddsMultipliers.awayWin.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      ) : !predictionsClosed ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Odds multipliers hidden until prediction deadline
        </div>
      ) : null}

      {/* STATE 3: Completed match — Predictions vs Result comparison table */}
      {isCompleted && comparisonData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h2 className="font-semibold mb-1">Predictions vs Result</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Compare everyone&apos;s predictions against the final score
          </p>

          {/* Actual result reminder */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-4 flex justify-between items-center border border-gray-100 dark:border-gray-600">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Actual Result</span>
            <span className="font-mono font-bold text-lg">
              {match.homeScore} - {match.awayScore}
              {match.penaltyWinner && ` (pen: ${match.penaltyWinner})`}
            </span>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2">Player</th>
                  <th className="py-2 text-center">Prediction</th>
                  <th className="py-2 text-center">Accuracy</th>
                  <th className="py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((entry, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-3">
                      <span className={`font-medium ${entry.accuracy === "none" ? "text-gray-400 dark:text-gray-500" : ""}`}>
                        {entry.playerName}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {entry.homeScore !== null ? (
                        <span
                          className={`font-mono px-2 py-0.5 rounded ${
                            entry.accuracy === "exact"
                              ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : entry.accuracy === "result"
                                ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {entry.homeScore} - {entry.awayScore}
                          {entry.penaltyWinner && ` (pen: ${entry.penaltyWinner})`}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                          No prediction
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {entry.accuracy === "exact" && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs rounded-full font-medium">
                          ✓ Exact
                        </span>
                      )}
                      {entry.accuracy === "result" && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs rounded-full font-medium">
                          ~ Result
                        </span>
                      )}
                      {entry.accuracy === "wrong" && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs rounded-full font-medium">
                          ✗ Wrong
                        </span>
                      )}
                      {entry.accuracy === "none" && (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className={`py-3 text-right font-bold ${
                      entry.accuracy === "exact"
                        ? "text-green-700 dark:text-green-400"
                        : entry.accuracy === "result"
                          ? "text-yellow-700 dark:text-yellow-400"
                          : entry.accuracy === "wrong" || entry.accuracy === "none"
                            ? "text-red-700 dark:text-red-400"
                            : ""
                    }`}>
                      {entry.totalPoints.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed points breakdown (collapsible) */}
          <details className="mt-4">
            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
              Show detailed points breakdown
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-1">Player</th>
                    <th className="py-1 text-right">Base</th>
                    <th className="py-1 text-right">Odds ×</th>
                    <th className="py-1 text-right">Team ×</th>
                    <th className="py-1 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className={`py-1 ${entry.accuracy === "none" ? "text-gray-400 dark:text-gray-500" : ""}`}>
                        {entry.playerName}
                      </td>
                      <td className="py-1 text-right">{entry.basePoints}</td>
                      <td className="py-1 text-right">
                        {entry.oddsMultiplier > 0 ? `${entry.oddsMultiplier.toFixed(2)}x` : "—"}
                      </td>
                      <td className="py-1 text-right">
                        {entry.teamMultiplier > 0 ? `${entry.teamMultiplier}x` : "—"}
                      </td>
                      <td className="py-1 text-right font-bold">{entry.totalPoints.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* STATE 2: Locked but not completed — show predictions only */}
      {predictionsClosed && !isCompleted && predictions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h2 className="font-semibold mb-3">Predictions</h2>
          <div className="space-y-1">
            {predictions.map((pred, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <span className="text-sm">{pred.playerName}</span>
                <span className="font-mono text-sm">
                  {pred.homeScore} - {pred.awayScore}
                  {pred.penaltyWinner && ` (pen: ${pred.penaltyWinner})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
