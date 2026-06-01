import { cookies } from "next/headers";
import { setTimeOverride } from "./time";
import { isTestMode } from "../test-mode/test-mode";

/**
 * Apply time override from query param or cookie.
 * Call this at the top of server components in test mode.
 */
export async function applyTimeOverride(timeParam?: string): Promise<void> {
  if (!isTestMode()) return;

  // Check query param first
  if (timeParam) {
    const date = new Date(timeParam);
    if (!isNaN(date.getTime())) {
      setTimeOverride(date);
      return;
    }
  }

  // Check cookie
  try {
    const cookieStore = await cookies();
    const timeOverrideCookie = cookieStore.get("time_override")?.value;
    if (timeOverrideCookie) {
      const date = new Date(decodeURIComponent(timeOverrideCookie));
      if (!isNaN(date.getTime())) {
        setTimeOverride(date);
        return;
      }
    }
  } catch {
    // cookies() may not be available in all contexts
  }

  // No override - reset
  setTimeOverride(null);
}
