import { resolveGroup } from "@/lib/groups/group-service";
import { getLeaderboard } from "@/lib/leaderboard/leaderboard-service";
import { notFound } from "next/navigation";
import { LeaderboardTable } from "./leaderboard-table";

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
        <LeaderboardTable entries={leaderboard} />
      )}
    </div>
  );
}
