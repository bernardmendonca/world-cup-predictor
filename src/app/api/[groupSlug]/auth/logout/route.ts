import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/lib/auth/auth-service";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (sessionToken) {
    await logout(sessionToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("session_token");

  return response;
}
