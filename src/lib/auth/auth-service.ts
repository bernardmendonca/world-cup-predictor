import { prisma } from "../db";
import { getConfig } from "../config";
import { randomBytes } from "crypto";

export interface SessionData {
  id: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  groupId: string;
  groupSlug: string;
  expiresAt: Date;
}

/**
 * Create a session for a player. Returns the session token.
 */
export async function createSession(playerId: string): Promise<string> {
  const config = getConfig();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + config.sessionDurationDays * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: { playerId, token, expiresAt },
  });

  return token;
}

/**
 * Validate a session token and return session data.
 */
export async function validateSession(
  token: string
): Promise<SessionData | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      player: {
        include: { group: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired - clean up (use deleteMany to avoid P2025 race condition)
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.id,
    playerId: session.player.id,
    playerName: session.player.name,
    playerEmail: session.player.email,
    groupId: session.player.group.id,
    groupSlug: session.player.group.slug,
    expiresAt: session.expiresAt,
  };
}

/**
 * Logout: delete the session.
 */
export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/**
 * Login or register a player in a group via email.
 * In a real app this would send a magic link; here we just create the session directly.
 */
export async function loginOrRegister(
  email: string,
  name: string,
  groupSlug: string
): Promise<{ token: string; playerId: string } | { error: string }> {
  const config = getConfig();

  // Find or create the group
  let group = await prisma.group.findUnique({ where: { slug: groupSlug } });
  if (!group) {
    group = await prisma.group.create({
      data: { slug: groupSlug, name: groupSlug },
    });
  }

  // Check if player already exists in this group
  let player = await prisma.player.findUnique({
    where: { groupId_email: { groupId: group.id, email: email.toLowerCase() } },
  });

  if (!player) {
    // Check max players per group
    const playerCount = await prisma.player.count({
      where: { groupId: group.id },
    });
    if (playerCount >= config.maxPlayersPerGroup) {
      return { error: "This group has reached the maximum number of players." };
    }

    player = await prisma.player.create({
      data: {
        groupId: group.id,
        email: email.toLowerCase(),
        name,
      },
    });
  }

  const token = await createSession(player.id);
  return { token, playerId: player.id };
}

/**
 * Check if an email is an admin.
 */
export function isAdmin(email: string): boolean {
  const config = getConfig();
  return config.adminEmails.includes(email.toLowerCase());
}
