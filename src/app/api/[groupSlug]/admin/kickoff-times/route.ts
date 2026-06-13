import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayerFromRequest } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const resolvedParams = await params;
  const player = await getCurrentPlayerFromRequest(request, resolvedParams.groupSlug);
  if (!player) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTestMode() && !isAdmin(player.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { updates } = body as {
      updates: Array<{ matchId: string; kickoffTime: string }>;
    };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates array is required." },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;

    for (const { matchId, kickoffTime } of updates) {
      if (!matchId || !kickoffTime) {
        failed++;
        continue;
      }

      const parsedTime = new Date(kickoffTime);
      if (isNaN(parsedTime.getTime())) {
        failed++;
        continue;
      }

      try {
        await prisma.match.update({
          where: { id: matchId },
          data: { kickoffTime: parsedTime },
        });
        success++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success, failed });
  } catch (error) {
    console.error("Update kickoff times error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
