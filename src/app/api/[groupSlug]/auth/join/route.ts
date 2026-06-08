import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/auth-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const { groupSlug } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Find player by invite token
  const player = await prisma.player.findUnique({
    where: { inviteToken: token },
    include: { group: true },
  });

  if (!player || player.group.slug !== groupSlug) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  // Create a session for this player
  const sessionToken = await createSession(player.id);

  // Build the redirect URL using the original request's host (preserves the public Railway domain)
  const host = request.headers.get("host") || request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const redirectUrl = `${protocol}://${host}/${groupSlug}/predict`;
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 24 * 60 * 60, // 60 days — lasts the whole tournament
    path: "/",
  });

  return response;
}
