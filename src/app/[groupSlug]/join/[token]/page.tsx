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

  // Create a session for this player
  const sessionToken = await createSession(player.id);

  // Set the session cookie
  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 24 * 60 * 60, // 60 days — lasts the whole tournament
    path: "/",
  });

  // Redirect to the predict page
  redirect(`/${groupSlug}/predict`);
}
