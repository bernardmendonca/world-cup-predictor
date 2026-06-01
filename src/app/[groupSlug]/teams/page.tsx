import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { selectFavoriteTeam, selectMinnowTeam, getPlayerSelections, isTeamSelectionOpen } from "@/lib/predictions/team-selection";
import { redirect } from "next/navigation";
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
  if (!player) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please log in to select teams.</p>
      </div>
    );
  }

  const teams = await prisma.team.findMany({
    orderBy: [{ groupLetter: "asc" }, { fifaRanking: "asc" }],
  });

  const selections = await getPlayerSelections(player.id);
  const selectionOpen = await isTeamSelectionOpen();

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
      <h1 className="text-2xl font-bold mb-2">Team Selection</h1>
      <p className="text-sm text-gray-500 mb-6">
        Choose your favorite team (2x multiplier) and minnow team (3x multiplier)
        for matches involving them.
        {!selectionOpen && (
          <span className="text-red-600 ml-2">Selection window is closed.</span>
        )}
      </p>

      {selections.favoriteTeamId || selections.minnowTeamId ? (
        <div className="bg-blue-50 rounded border p-4 mb-6">
          <h2 className="font-semibold mb-2">Your Selections</h2>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-600">Favorite: </span>
              <span className="font-medium">
                {teams.find((t) => t.id === selections.favoriteTeamId)?.name || "Not selected"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Minnow: </span>
              <span className="font-medium">
                {teams.find((t) => t.id === selections.minnowTeamId)?.name || "Not selected"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {selectionOpen && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <form action={handleFavorite} className="bg-white rounded border p-4">
            <h2 className="font-semibold mb-2">Select Favorite Team</h2>
            <p className="text-xs text-gray-500 mb-3">
              2x multiplier when your favorite team is playing
            </p>
            <input type="hidden" name="groupSlug" value={resolvedParams.groupSlug} />
            <select
              name="teamId"
              defaultValue={selections.favoriteTeamId || ""}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Choose a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.code}) - Rank #{team.fifaRanking}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Set Favorite
            </button>
          </form>

          <form action={handleMinnow} className="bg-white rounded border p-4">
            <h2 className="font-semibold mb-2">Select Minnow Team</h2>
            <p className="text-xs text-gray-500 mb-3">
              3x multiplier when your minnow team is playing
            </p>
            <input type="hidden" name="groupSlug" value={resolvedParams.groupSlug} />
            <select
              name="teamId"
              defaultValue={selections.minnowTeamId || ""}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Choose a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.code}) - Rank #{team.fifaRanking}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Set Minnow
            </button>
          </form>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">All Teams</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(teamsByGroup).map(([letter, groupTeams]) => (
          <div key={letter} className="bg-white rounded border p-3">
            <h3 className="font-semibold text-sm text-gray-500 mb-2">
              Group {letter}
            </h3>
            <div className="space-y-1">
              {groupTeams.map((team) => (
                <div
                  key={team.id}
                  className={`text-sm flex justify-between ${
                    team.id === selections.favoriteTeamId
                      ? "text-blue-600 font-medium"
                      : team.id === selections.minnowTeamId
                        ? "text-green-600 font-medium"
                        : ""
                  }`}
                >
                  <span>
                    {team.name} ({team.code})
                  </span>
                  <span className="text-gray-400">#{team.fifaRanking}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function handleFavorite(formData: FormData) {
  "use server";
  const groupSlug = formData.get("groupSlug") as string;
  const teamId = formData.get("teamId") as string;
  const player = await getCurrentPlayer(groupSlug);
  if (!player || !teamId) return;
  await selectFavoriteTeam(player.id, teamId);
  redirect(`/${groupSlug}/teams`);
}

async function handleMinnow(formData: FormData) {
  "use server";
  const groupSlug = formData.get("groupSlug") as string;
  const teamId = formData.get("teamId") as string;
  const player = await getCurrentPlayer(groupSlug);
  if (!player || !teamId) return;
  await selectMinnowTeam(player.id, teamId);
  redirect(`/${groupSlug}/teams`);
}
