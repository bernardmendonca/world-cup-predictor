import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayerFromRequest } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";
import { recordResult } from "@/lib/matches/match-service";
import { calculateMatchScores } from "@/lib/scoring/scoring-service";
import { isTestMode } from "@/lib/test-mode/test-mode";
import type { PenaltyWinner } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const resolvedParams = await params;
  const player = await getCurrentPlayerFromRequest(request, resolvedParams.groupSlug);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check: in test mode, all players are admin
  if (!isTestMode() && !isAdmin(player.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { matchId, homeScore, awayScore, penaltyWinner } = body;

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: "matchId, homeScore, and awayScore are required." },
        { status: 400 }
      );
    }

    // Record the result
    await recordResult(
      matchId,
      Number(homeScore),
      Number(awayScore),
      penaltyWinner as PenaltyWinner | undefined
    );

    // Automatically calculate scores for all players in this group (Task 11.1)
    const scores = await calculateMatchScores(
      player.groupId,
      matchId,
      Number(homeScore),
      Number(awayScore),
      penaltyWinner as PenaltyWinner | undefined
    );

    const totalPoints = scores.reduce((sum, s) => sum + s.totalPoints, 0);
    const avgPoints = scores.length > 0 ? totalPoints / scores.length : 0;

    return NextResponse.json({
      success: true,
      matchId,
      playersScored: scores.length,
      averagePoints: Math.round(avgPoints * 100) / 100,
      leaderboardUpdated: true,
    });
  } catch (error) {
    console.error("Record result error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
