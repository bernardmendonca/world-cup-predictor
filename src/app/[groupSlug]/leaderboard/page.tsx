import { resolveGroup } from "@/lib/groups/group-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { notFound } from "next/navigation";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const resolvedParams = await params;
  let group;
  try {
    group = await resolveGroup(resolvedParams.groupSlug);
  } catch {
    notFound();
  }

  const leaderboard = await getLeaderboard(group.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>

      {leaderboard.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No scores yet. The leaderboard will update once match results are recorded.
        </p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Player</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">
                  Points
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">
                  Correct
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">
                  Exact
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.playerId} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 font-bold text-gray-400 dark:text-gray-500">
                    {entry.rank}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.playerName}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {entry.totalPoints.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {entry.correctPredictions}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {entry.exactScores}
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
