import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { resolveGroup } from "@/lib/groups/group-service";
import { notFound } from "next/navigation";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";
import { AdminBatchForm } from "./admin-batch-form";
import type { AdminMatchData } from "./admin-batch-form";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ time?: string; section?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  const player = await getCurrentPlayer(resolvedParams.groupSlug);
  if (!player) {
    return <div className="text-center py-8 text-gray-500">Please log in.</div>;
  }

  if (!isTestMode() && !isAdmin(player.email)) {
    return <div className="text-center py-8 text-red-600">Access denied.</div>;
  }

  let group;
  try {
    group = await resolveGroup(resolvedParams.groupSlug);
  } catch {
    notFound();
  }

  const section = resolvedSearchParams.section || "results";

  // Get all matches for result entry
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  const matchData: AdminMatchData[] = matches.map((match) => ({
    id: match.id,
    matchNumber: match.matchNumber,
    homeTeamName: match.homeTeam?.name || match.homeSlotLabel || "TBD",
    awayTeamName: match.awayTeam?.name || match.awaySlotLabel || "TBD",
    homeTeamCode: match.homeTeam?.code || null,
    awayTeamCode: match.awayTeam?.code || null,
    stage: match.stage,
    knockoutRound: match.knockoutRound,
    groupLetter: match.groupLetter,
    kickoffTime: match.kickoffTime.toISOString(),
    status: match.status,
    existingHomeScore: match.homeScore,
    existingAwayScore: match.awayScore,
    existingPenaltyWinner: match.penaltyWinner,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeSlotLabel: match.homeSlotLabel,
    awaySlotLabel: match.awaySlotLabel,
  }));

  const teamList = teams.map((t) => ({ id: t.id, name: t.name, code: t.code }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <div className="flex gap-2 mb-4">
        <a
          href={`/${resolvedParams.groupSlug}/admin?section=results`}
          className={`px-3 py-1 rounded text-sm ${section === "results" ? "bg-red-600 text-white" : "bg-gray-200"}`}
        >
          Record Results
        </a>
        <a
          href={`/${resolvedParams.groupSlug}/admin?section=knockout`}
          className={`px-3 py-1 rounded text-sm ${section === "knockout" ? "bg-orange-600 text-white" : "bg-gray-200"}`}
        >
          Assign Knockout Teams
        </a>
      </div>

      <AdminBatchForm
        matches={matchData}
        teams={teamList}
        groupSlug={resolvedParams.groupSlug}
        groupId={group.id}
        section={section}
      />
    </div>
  );
}
