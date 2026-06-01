import { prisma } from "@/lib/db";
import { formatTimeZones } from "@/lib/utils/timezone";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";

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

      <div className="flex gap-2 mb-4">
        <a
          href={`/${resolvedParams.groupSlug}/matches`}
          className={`px-3 py-1 rounded text-sm ${!stageFilter ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          All
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/matches?stage=group`}
          className={`px-3 py-1 rounded text-sm ${stageFilter === "group" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Group Stage
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/matches?stage=knockout`}
          className={`px-3 py-1 rounded text-sm ${stageFilter === "knockout" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Knockout
        </a>
      </div>

      <div className="space-y-2">
        {matches.map((match) => {
          const tz = formatTimeZones(match.kickoffTime);
          return (
            <a
              key={match.id}
              href={`/${resolvedParams.groupSlug}/matches/${match.id}`}
              className="block p-3 bg-white rounded border hover:border-blue-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-400 mr-2">
                    #{match.matchNumber}
                  </span>
                  <span className="font-medium">
                    {match.homeTeam?.name || match.homeSlotLabel || "TBD"}
                  </span>
                  <span className="text-gray-400 mx-2">
                    {match.status === "completed"
                      ? `${match.homeScore} - ${match.awayScore}`
                      : "vs"}
                  </span>
                  <span className="font-medium">
                    {match.awayTeam?.name || match.awaySlotLabel || "TBD"}
                  </span>
                  {match.penaltyWinner && (
                    <span className="text-xs text-gray-500 ml-1">
                      (pen)
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    match.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : match.status === "in_progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {match.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex gap-4">
                <span>🇺🇸 {tz.eastern}</span>
                <span>🇬🇧 {tz.uk}</span>
                <span>🇮🇳 {tz.ist}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {match.venue} ·{" "}
                {match.stage === "group"
                  ? `Group ${match.groupLetter}`
                  : match.knockoutRound}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
