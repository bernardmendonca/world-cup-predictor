import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayerFromRequest } from "@/lib/auth/get-session";
import {
  selectFavoriteTeam,
  selectMinnowTeam,
  getPlayerSelections,
} from "@/lib/predictions/team-selection";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const resolvedParams = await params;
  const player = await getCurrentPlayerFromRequest(request, resolvedParams.groupSlug);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { favoriteTeamId, minnowTeamId } = body;

    const results: { favorite?: string; minnow?: string } = {};

    if (favoriteTeamId) {
      const result = await selectFavoriteTeam(player.id, favoriteTeamId);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      results.favorite = result.message;
    }

    if (minnowTeamId) {
      const result = await selectMinnowTeam(player.id, minnowTeamId);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      results.minnow = result.message;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Team selection error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const resolvedParams = await params;
  const player = await getCurrentPlayerFromRequest(request, resolvedParams.groupSlug);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selections = await getPlayerSelections(player.id);
  return NextResponse.json({ selections });
}
