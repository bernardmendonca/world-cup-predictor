import { prisma } from "../db";
import type { Group } from "../types";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 30;
}

export async function resolveGroup(slug: string): Promise<Group> {
  if (!isValidSlug(slug)) {
    throw new Error(
      "Invalid group slug. Must be 3-30 characters, lowercase alphanumeric and hyphens only."
    );
  }

  const existing = await prisma.group.findUnique({ where: { slug } });
  if (existing) {
    return existing;
  }

  // Create on-demand
  const created = await prisma.group.create({
    data: {
      slug,
      name: slug,
    },
  });
  return created;
}

export async function getGroupBySlug(slug: string): Promise<Group | null> {
  return prisma.group.findUnique({ where: { slug } });
}

export async function getGroup(groupId: string): Promise<Group | null> {
  return prisma.group.findUnique({ where: { id: groupId } });
}
