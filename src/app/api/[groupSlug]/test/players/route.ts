import { NextRequest, NextResponse } from "next/server";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const resolvedParams = await params;
  if (!isTestMode()) {
    return NextResponse.json({ error: "Not in test mode" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { slug: resolvedParams.groupSlug },
  });
  if (!group) {
    return NextResponse.json({ players: [], currentPlayerId: null });
  }

  const players = await prisma.player.findMany({
    where: { groupId: group.id },
    select: { id: true, name: true },
  });

  // Get current player from cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/test_player_id=([^;]+)/);
  const currentPlayerId = match ? match[1] : players[0]?.id || null;

  return NextResponse.json({ players, currentPlayerId });
}
