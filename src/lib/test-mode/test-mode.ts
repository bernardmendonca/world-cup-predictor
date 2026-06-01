import { prisma } from "../db";
import { getConfig } from "../config";

const TEST_GROUP_SLUG = "test-group";

const TEST_PLAYERS = [
  { name: "Alice Test", email: "alice@test.com" },
  { name: "Bob Test", email: "bob@test.com" },
  { name: "Charlie Test", email: "charlie@test.com" },
];

export function isTestMode(): boolean {
  return getConfig().deploymentMode === "test";
}

/**
 * Ensure the test group and dummy players exist.
 * Called on app startup in test mode.
 */
export async function ensureTestData(): Promise<void> {
  if (!isTestMode()) return;

  // Find or create test group
  let group = await prisma.group.findUnique({
    where: { slug: TEST_GROUP_SLUG },
  });

  if (!group) {
    group = await prisma.group.create({
      data: { slug: TEST_GROUP_SLUG, name: "Test Group" },
    });
  }

  // Create dummy players if they don't exist
  for (const tp of TEST_PLAYERS) {
    const existing = await prisma.player.findUnique({
      where: { groupId_email: { groupId: group.id, email: tp.email } },
    });
    if (!existing) {
      await prisma.player.create({
        data: {
          groupId: group.id,
          name: tp.name,
          email: tp.email,
        },
      });
    }
  }
}

/**
 * Get test players for the player switcher.
 */
export async function getTestPlayers() {
  if (!isTestMode()) return [];

  const group = await prisma.group.findUnique({
    where: { slug: TEST_GROUP_SLUG },
  });
  if (!group) return [];

  return prisma.player.findMany({
    where: { groupId: group.id },
    select: { id: true, name: true, email: true, groupId: true },
  });
}

/**
 * Get the test group slug.
 */
export function getTestGroupSlug(): string {
  return TEST_GROUP_SLUG;
}
