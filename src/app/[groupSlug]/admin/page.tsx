import { prisma } from "@/lib/db";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { resolveGroup } from "@/lib/groups/group-service";
import { isPredictionOpen } from "@/lib/utils/time";
import { notFound } from "next/navigation";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";
import { AdminBatchForm } from "./admin-batch-form";
import { PlayerManagement } from "./player-management";
import type { AdminMatchData } from "./admin-batch-form";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ time?: string; section?: string; adminKey?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  // Allow access via ADMIN_SECRET query param for bootstrap
  const adminSecret = process.env.ADMIN_SECRET;
  const bootstrapAccess =
    resolvedSearchParams.adminKey &&
    adminSecret &&
    resolvedSearchParams.adminKey === adminSecret;

  const player = await getCurrentPlayer(resolvedParams.groupSlug);

  if (!isTestMode() && !bootstrapAccess) {
    if (!player) {
      return <div className="text-center py-8 text-gray-500">Please log in.</div>;
    }
    if (!isAdmin(player.email)) {
      return <div className="text-center py-8 text-red-600">Access denied.</div>;
    }
  }

  let group;
  try {
    group = await resolveGroup(resolvedParams.groupSlug);
  } catch {
    // If group doesn't exist and we have bootstrap access, create it
    if (bootstrapAccess) {
      group = await prisma.group.create({
        data: { slug: resolvedParams.groupSlug, name: resolvedParams.groupSlug },
      });
    } else {
      notFound();
    }
  }

  const section = resolvedSearchParams.section || "players";

  // Get all players for the player management section
  const players = await prisma.player.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      inviteToken: true,
      createdAt: true,
    },
  });

  // Get all matches for result entry
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: "asc" },
  });

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  // Fetch prediction status per match for the admin view
  const groupPredictions = await prisma.groupPrediction.findMany({
    where: { player: { groupId: group.id } },
    select: { matchId: true, playerId: true },
  });
  const knockoutPredictions = await prisma.knockoutPrediction.findMany({
    where: { player: { groupId: group.id } },
    select: { matchId: true, playerId: true },
  });

  // Build a map: matchId → set of playerIds who predicted
  const predictionsByMatch: Record<string, Set<string>> = {};
  for (const gp of groupPredictions) {
    if (!predictionsByMatch[gp.matchId]) predictionsByMatch[gp.matchId] = new Set();
    predictionsByMatch[gp.matchId].add(gp.playerId);
  }
  for (const kp of knockoutPredictions) {
    if (!predictionsByMatch[kp.matchId]) predictionsByMatch[kp.matchId] = new Set();
    predictionsByMatch[kp.matchId].add(kp.playerId);
  }

  const totalPlayers = players.length;
  const playerNameMap: Record<string, string> = {};
  for (const p of players) {
    playerNameMap[p.id] = p.name;
  }

  const matchData: AdminMatchData[] = matches.map((match) => {
    const predictedPlayerIds = predictionsByMatch[match.id] || new Set<string>();
    const predictedCount = predictedPlayerIds.size;
    const deadlineOpen = isPredictionOpen(match.kickoffTime);
    const missingPlayerNames = deadlineOpen
      ? players
          .filter((p) => !predictedPlayerIds.has(p.id))
          .map((p) => p.name)
      : [];

    return {
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
      predictedCount,
      totalPlayers,
      deadlineOpen,
      missingPlayerNames,
    };
  });

  const teamList = teams.map((t) => ({ id: t.id, name: t.name, code: t.code }));

  // Build the base admin URL (preserve adminKey if used for bootstrap)
  const adminBase = bootstrapAccess
    ? `/${resolvedParams.groupSlug}/admin?adminKey=${resolvedSearchParams.adminKey}`
    : `/${resolvedParams.groupSlug}/admin`;

  const sectionParam = (s: string) => {
    const sep = adminBase.includes("?") ? "&" : "?";
    return `${adminBase}${sep}section=${s}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <a
          href={sectionParam("players")}
          className={`px-3 py-1 rounded text-sm ${section === "players" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Players
        </a>
        <a
          href={sectionParam("results")}
          className={`px-3 py-1 rounded text-sm ${section === "results" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Record Results
        </a>
        <a
          href={sectionParam("knockout")}
          className={`px-3 py-1 rounded text-sm ${section === "knockout" ? "bg-orange-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Assign Knockout Teams
        </a>
      </div>

      {section === "players" ? (
        <PlayerManagement
          players={players.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
          groupSlug={resolvedParams.groupSlug}
          adminKey={bootstrapAccess ? resolvedSearchParams.adminKey : undefined}
        />
      ) : (
        <AdminBatchForm
          matches={matchData}
          teams={teamList}
          groupSlug={resolvedParams.groupSlug}
          groupId={group.id}
          section={section}
        />
      )}
    </div>
  );
}
