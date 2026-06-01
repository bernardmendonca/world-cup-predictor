import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayerFromRequest } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";
import { assignKnockoutTeams } from "@/lib/matches/match-service";
import { isTestMode } from "@/lib/test-mode/test-mode";

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
    const { matchId, homeTeamId, awayTeamId } = body;

    if (!matchId || !homeTeamId || !awayTeamId) {
      return NextResponse.json(
        { error: "matchId, homeTeamId, and awayTeamId are required." },
        { status: 400 }
      );
    }

    await assignKnockoutTeams(matchId, homeTeamId, awayTeamId);

    return NextResponse.json({
      success: true,
      message: "Teams assigned to knockout match.",
    });
  } catch (error) {
    console.error("Knockout assign error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
