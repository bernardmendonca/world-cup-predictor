import { NextRequest, NextResponse } from "next/server";
import { loginOrRegister } from "@/lib/auth/auth-service";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/auth-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupSlug: string }> }
) {
  const { groupSlug } = await params;

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required." },
        { status: 400 }
      );
    }

    const result = await loginOrRegister(email, name, groupSlug);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      playerId: result.playerId,
    });

    // Set session cookie
    response.cookies.set("session_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
