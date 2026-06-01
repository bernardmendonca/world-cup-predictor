import { cookies } from "next/headers";
import { prisma } from "../db";
import { validateSession, type SessionData } from "./auth-service";
import { isTestMode } from "../test-mode/test-mode";

export interface CurrentPlayer {
  id: string;
  name: string;
  email: string;
  groupId: string;
  groupSlug: string;
}

/**
 * Get the current player from the session.
 * In test mode, uses the test_player_id cookie.
 * In production, validates the session token.
 */
export async function getCurrentPlayer(
  groupSlug: string
): Promise<CurrentPlayer | null> {
  const cookieStore = await cookies();

  if (isTestMode()) {
    // In test mode, use the test_player_id cookie
    const testPlayerId = cookieStore.get("test_player_id")?.value;

    if (testPlayerId) {
      const player = await prisma.player.findUnique({
        where: { id: testPlayerId },
        include: { group: true },
      });
      if (player) {
        return {
          id: player.id,
          name: player.name,
          email: player.email,
          groupId: player.group.id,
          groupSlug: player.group.slug,
        };
      }
    }

    // Default to first player in the group
    const group = await prisma.group.findUnique({ where: { slug: groupSlug } });
    if (!group) return null;

    const firstPlayer = await prisma.player.findFirst({
      where: { groupId: group.id },
      include: { group: true },
    });

    if (firstPlayer) {
      return {
        id: firstPlayer.id,
        name: firstPlayer.name,
        email: firstPlayer.email,
        groupId: firstPlayer.group.id,
        groupSlug: firstPlayer.group.slug,
      };
    }

    return null;
  }

  // Production mode: validate session token
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) return null;

  const session = await validateSession(sessionToken);
  if (!session) return null;

  // Verify the session belongs to this group
  if (session.groupSlug !== groupSlug) return null;

  return {
    id: session.playerId,
    name: session.playerName,
    email: session.playerEmail,
    groupId: session.groupId,
    groupSlug: session.groupSlug,
  };
}

/**
 * Get current player from request headers/cookies for API routes.
 */
export async function getCurrentPlayerFromRequest(
  request: Request,
  groupSlug: string
): Promise<CurrentPlayer | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMap = parseCookies(cookieHeader);

  if (isTestMode()) {
    const testPlayerId = cookieMap["test_player_id"];

    if (testPlayerId) {
      const player = await prisma.player.findUnique({
        where: { id: testPlayerId },
        include: { group: true },
      });
      if (player) {
        return {
          id: player.id,
          name: player.name,
          email: player.email,
          groupId: player.group.id,
          groupSlug: player.group.slug,
        };
      }
    }

    // Default to first player in the group
    const group = await prisma.group.findUnique({ where: { slug: groupSlug } });
    if (!group) return null;

    const firstPlayer = await prisma.player.findFirst({
      where: { groupId: group.id },
      include: { group: true },
    });

    if (firstPlayer) {
      return {
        id: firstPlayer.id,
        name: firstPlayer.name,
        email: firstPlayer.email,
        groupId: firstPlayer.group.id,
        groupSlug: firstPlayer.group.slug,
      };
    }

    return null;
  }

  // Production mode
  const sessionToken = cookieMap["session_token"];
  if (!sessionToken) return null;

  const session = await validateSession(sessionToken);
  if (!session) return null;
  if (session.groupSlug !== groupSlug) return null;

  return {
    id: session.playerId,
    name: session.playerName,
    email: session.playerEmail,
    groupId: session.groupId,
    groupSlug: session.groupSlug,
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...rest] = cookie.split("=");
    if (key) {
      cookies[key.trim()] = rest.join("=").trim();
    }
  });
  return cookies;
}
