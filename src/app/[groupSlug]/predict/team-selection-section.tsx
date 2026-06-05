import { getCurrentPlayer } from "@/lib/auth/get-session";
import { selectFavoriteTeam, selectMinnowTeam } from "@/lib/predictions/team-selection";
import { redirect } from "next/navigation";
import type { TeamSelections } from "@/lib/types";

interface Team {
  id: string;
  name: string;
  code: string;
  fifaRanking: number;
  groupLetter: string;
}

interface Props {
  teams: Team[];
  selections: TeamSelections;
  selectionOpen: boolean;
  groupSlug: string;
}

export function TeamSelectionSection({ teams, selections, selectionOpen, groupSlug }: Props) {
  const favoriteTeam = teams.find((t) => t.id === selections.favoriteTeamId);
  const minnowTeam = teams.find((t) => t.id === selections.minnowTeamId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h2 className="font-semibold mb-2">Your Team Selections</h2>
      {!selectionOpen && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">Selection window is closed.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Current selections display (always visible) */}
        <div className="flex-1">
          <div className="text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Favorite: </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {favoriteTeam ? `${favoriteTeam.name} (${favoriteTeam.code})` : "Not selected"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">2x multiplier</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Minnow: </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {minnowTeam ? `${minnowTeam.name} (${minnowTeam.code})` : "Not selected"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">2x multiplier</span>
          </div>
        </div>

        {/* Selection forms (only when open) */}
        {selectionOpen && (
          <div className="flex flex-col sm:flex-row gap-2">
            <form action={handleFavorite}>
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <div className="flex items-center gap-2">
                <select
                  name="teamId"
                  defaultValue={selections.favoriteTeamId || ""}
                  className="px-2 py-1 border rounded text-sm w-[180px] bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  required
                >
                  <option value="">Favorite...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.code})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Set
                </button>
              </div>
            </form>

            <form action={handleMinnow}>
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <div className="flex items-center gap-2">
                <select
                  name="teamId"
                  defaultValue={selections.minnowTeamId || ""}
                  className="px-2 py-1 border rounded text-sm w-[180px] bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  required
                >
                  <option value="">Minnow...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.code})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        )}
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
  redirect(`/${groupSlug}/predict`);
}

async function handleMinnow(formData: FormData) {
  "use server";
  const groupSlug = formData.get("groupSlug") as string;
  const teamId = formData.get("teamId") as string;
  const player = await getCurrentPlayer(groupSlug);
  if (!player || !teamId) return;
  await selectMinnowTeam(player.id, teamId);
  redirect(`/${groupSlug}/predict`);
}
