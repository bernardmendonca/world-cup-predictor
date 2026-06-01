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
        <p className="text-gray-500">
          No scores yet. The leaderboard will update once match results are recorded.
        </p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-gray-500">#</th>
                <th className="px-4 py-3 font-medium text-gray-500">Player</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">
                  Points
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">
                  Correct
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">
                  Exact
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.playerId} className="border-t">
                  <td className="px-4 py-3 font-bold text-gray-400">
                    {entry.rank}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.playerName}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {entry.totalPoints.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {entry.correctPredictions}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
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
