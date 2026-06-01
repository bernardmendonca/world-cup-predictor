import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayerFromRequest } from "@/lib/auth/get-session";
import {
  submitGroupPrediction,
  getGroupPrediction,
} from "@/lib/predictions/group-predictions";

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
    const { matchId, homeScore, awayScore } = body;

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: "matchId, homeScore, and awayScore are required." },
        { status: 400 }
      );
    }

    const result = await submitGroupPrediction(
      player.id,
      matchId,
      Number(homeScore),
      Number(awayScore)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Group prediction error:", error);
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

  const matchId = request.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json(
      { error: "matchId query param is required." },
      { status: 400 }
    );
  }

  const prediction = await getGroupPrediction(player.id, matchId);
  return NextResponse.json({ prediction });
}
