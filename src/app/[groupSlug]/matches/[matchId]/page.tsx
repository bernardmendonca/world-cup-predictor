import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatTimeZones } from "@/lib/utils/timezone";
import { isPredictionOpen, getCurrentTime } from "@/lib/utils/time";
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

  // Get predictions only after deadline (Task 11.2)
  let predictions: Array<{
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
        playerName: kp.player.name,
        homeScore: kp.homeScore,
        awayScore: kp.awayScore,
        penaltyWinner: kp.penaltyWinner,
      }));
    }

    // Show odds multipliers after deadline (Task 11.2)
    try {
      oddsMultipliers = await getOddsMultipliers(group.id, match.id);
    } catch {
      // No predictions yet
    }
  }

  // Get scores if match is completed
  const scores = match.status === "completed"
    ? await prisma.matchScore.findMany({
        where: { matchId: match.id },
        include: { player: true },
        orderBy: { totalPoints: "desc" },
      })
    : [];

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
        </div>
      </div>

      {/* Odds Multipliers - Task 11.2 */}
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

      {/* Predictions */}
      {predictionsClosed && predictions.length > 0 && (
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

      {!predictionsClosed && (
        <div className="text-center">
          <a
            href={`/${resolvedParams.groupSlug}/predict/${match.id}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Make Prediction
          </a>
        </div>
      )}

      {/* Scores */}
      {scores.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold mb-3">Scores</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-1">Player</th>
                <th className="py-1 text-right">Base</th>
                <th className="py-1 text-right">Odds</th>
                <th className="py-1 text-right">Team</th>
                <th className="py-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {scores
                .filter((s) => s.player.groupId === group.id)
                .map((score) => (
                  <tr key={score.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-1">{score.player.name}</td>
                    <td className="py-1 text-right">{score.basePoints}</td>
                    <td className="py-1 text-right">
                      {score.oddsMultiplier.toFixed(2)}x
                    </td>
                    <td className="py-1 text-right">{score.teamMultiplier}x</td>
                    <td className="py-1 text-right font-bold">
                      {score.totalPoints.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
