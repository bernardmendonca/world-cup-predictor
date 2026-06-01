import { NextRequest, NextResponse } from "next/server";
import { isTestMode } from "@/lib/test-mode/test-mode";

export async function POST(request: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json({ error: "Not in test mode" }, { status: 403 });
  }

  const body = await request.json();
  const { playerId } = body;

  if (!playerId) {
    return NextResponse.json(
      { error: "playerId is required" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("test_player_id", playerId, {
    httpOnly: false,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
