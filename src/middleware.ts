import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect routes under /[groupSlug]/ that are not auth routes
  // Skip: root, API routes (handled separately), static files
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 1) return NextResponse.next();

  // Skip API routes - they handle their own auth
  if (segments[0] === "api") return NextResponse.next();

  // The first segment is the groupSlug for page routes
  const groupSlug = segments[0];

  // Skip auth pages
  if (segments.length >= 2 && segments[1] === "auth") {
    return NextResponse.next();
  }

  // Skip join/invite token pages — these handle their own auth
  if (segments.length >= 2 && segments[1] === "join") {
    return NextResponse.next();
  }

  // In test mode, bypass auth entirely
  const deploymentMode = process.env.DEPLOYMENT_MODE || "test";
  if (deploymentMode === "test") {
    return NextResponse.next();
  }

  // Allow admin bootstrap access via adminKey query param
  const adminKey = request.nextUrl.searchParams.get("adminKey");
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminKey && adminSecret && adminKey === adminSecret) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("session_token")?.value;
  if (!sessionToken) {
    // Redirect to login
    const loginUrl = new URL(`/${groupSlug}/auth/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session validation happens at the page/API level since middleware
  // can't do async DB calls in edge runtime
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
