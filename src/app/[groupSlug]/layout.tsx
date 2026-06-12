import { resolveGroup } from "@/lib/groups/group-service";
import { notFound } from "next/navigation";
import { PlayerSwitcher } from "./player-switcher";
import { TimeOverrideBar } from "./time-override-bar";
import { MobileNav } from "./mobile-nav";
import { isTestMode } from "@/lib/test-mode/test-mode";
import { ThemeToggle } from "../theme-toggle";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { isAdmin } from "@/lib/auth/auth-service";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;

  let group;
  try {
    group = await resolveGroup(groupSlug);
  } catch {
    notFound();
  }

  const testMode = isTestMode();
  const player = await getCurrentPlayer(groupSlug);
  const showAdmin = testMode || (player && isAdmin(player.email));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              href={`/${groupSlug}`}
              className="font-bold text-lg text-blue-600 dark:text-blue-400"
            >
              WCP 2026
            </a>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <a
                href={`/${groupSlug}/predict`}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Predict
              </a>
              <a
                href={`/${groupSlug}/teams`}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Teams
              </a>
              <a
                href={`/${groupSlug}/leaderboard`}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Leaderboard
              </a>
              <a
                href={`/${groupSlug}/rules`}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Rules
              </a>
              {showAdmin && (
                <a
                  href={`/${groupSlug}/admin`}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Admin
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {testMode && <PlayerSwitcher groupSlug={groupSlug} />}
            {!testMode && player && (
              <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
                {player.name}
              </span>
            )}
            <MobileNav groupSlug={groupSlug} showAdmin={!!showAdmin} />
          </div>
        </div>
      </nav>
      {testMode && <TimeOverrideBar />}
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
