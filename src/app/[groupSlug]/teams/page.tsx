import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { getPlayerSelections } from "@/lib/predictions/team-selection";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";

export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ time?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  const player = await getCurrentPlayer(resolvedParams.groupSlug);

  const teams = await prisma.team.findMany({
    orderBy: [{ groupLetter: "asc" }, { fifaRanking: "asc" }],
  });

  const selections = player ? await getPlayerSelections(player.id) : { favoriteTeamId: null, minnowTeamId: null };

  // Group teams by letter
  const teamsByGroup: Record<string, typeof teams> = {};
  for (const team of teams) {
    if (!teamsByGroup[team.groupLetter]) {
      teamsByGroup[team.groupLetter] = [];
    }
    teamsByGroup[team.groupLetter].push(team);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Teams</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        All 48 teams in the FIFA World Cup 2026. Team selections (favorite &amp; minnow) are managed on the{" "}
        <a href={`/${resolvedParams.groupSlug}/predict`} className="text-blue-600 dark:text-blue-400 underline">
          Predict
        </a>{" "}
        page.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(teamsByGroup).map(([letter, groupTeams]) => (
          <div key={letter} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">
              Group {letter}
            </h3>
            <div className="space-y-1">
              {groupTeams.map((team) => (
                <div
                  key={team.id}
                  className={`text-sm flex justify-between ${
                    team.id === selections.favoriteTeamId
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : team.id === selections.minnowTeamId
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : ""
                  }`}
                >
                  <span>
                    {team.name} ({team.code})
                    {team.id === selections.favoriteTeamId && " ⭐"}
                    {team.id === selections.minnowTeamId && " 🐟"}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">#{team.fifaRanking}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
