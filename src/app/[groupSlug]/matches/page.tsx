import { prisma } from "@/lib/db";
import { formatTimeZones } from "@/lib/utils/timezone";
import { isPredictionOpen } from "@/lib/utils/time";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ time?: string; stage?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  const stageFilter = resolvedSearchParams.stage;

  const matches = await prisma.match.findMany({
    where: stageFilter ? { stage: stageFilter } : undefined,
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Match Schedule</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <a
          href={`/${resolvedParams.groupSlug}/matches`}
          className={`px-3 py-1 rounded text-sm ${!stageFilter ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          All
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/matches?stage=group`}
          className={`px-3 py-1 rounded text-sm ${stageFilter === "group" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Group Stage
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/matches?stage=knockout`}
          className={`px-3 py-1 rounded text-sm ${stageFilter === "knockout" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Knockout
        </a>
      </div>

      <div className="space-y-2">
        {matches.map((match) => {
          const tz = formatTimeZones(match.kickoffTime);
          const predictionLocked = !isPredictionOpen(match.kickoffTime) || match.status === "completed";

          const rowContent = (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                    #{match.matchNumber}
                  </span>
                  <span className="font-medium">
                    {match.homeTeam?.name || match.homeSlotLabel || "TBD"}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 mx-2">
                    {match.status === "completed"
                      ? `${match.homeScore} - ${match.awayScore}`
                      : "vs"}
                  </span>
                  <span className="font-medium">
                    {match.awayTeam?.name || match.awaySlotLabel || "TBD"}
                  </span>
                  {match.penaltyWinner && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      (pen)
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    match.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : match.status === "in_progress"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {match.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-4 flex-wrap">
                <span>🇺🇸 {tz.eastern}</span>
                <span>🇬🇧 {tz.uk}</span>
                <span className="hidden sm:inline">🇮🇳 {tz.ist}</span>
                <span className="hidden sm:inline">🇦🇺 {tz.aest}</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {match.venue} ·{" "}
                {match.stage === "group"
                  ? `Group ${match.groupLetter}`
                  : match.knockoutRound}
              </div>
            </>
          );

          if (predictionLocked) {
            const detailHref = resolvedSearchParams.time
              ? `/${resolvedParams.groupSlug}/matches/${match.id}?time=${resolvedSearchParams.time}`
              : `/${resolvedParams.groupSlug}/matches/${match.id}`;
            return (
              <a
                key={match.id}
                href={detailHref}
                className="block p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                {rowContent}
              </a>
            );
          }

          return (
            <div
              key={match.id}
              className="block p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 opacity-75"
            >
              {rowContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
