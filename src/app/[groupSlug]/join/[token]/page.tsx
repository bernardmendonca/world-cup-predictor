import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/auth-service";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ groupSlug: string; token: string }>;
}) {
  const { groupSlug, token } = await params;

  // Find player by invite token
  const player = await prisma.player.findUnique({
    where: { inviteToken: token },
    include: { group: true },
  });

  if (!player || player.group.slug !== groupSlug) {
    notFound();
  }

  // Redirect to the API route handler that sets the cookie
  redirect(`/api/${groupSlug}/auth/join?token=${token}`);
}
