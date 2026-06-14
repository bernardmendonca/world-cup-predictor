"use client";

import { useEffect } from "react";

/**
 * Scrolls to the first upcoming (non-completed) match on page mount.
 * Accepts a match ID to scroll to, and uses a data attribute selector to find the element.
 *
 * @param nextMatchId - The ID of the next upcoming match, or null if all matches are completed / none exist.
 */
export function useScrollToUpcoming(nextMatchId: string | null) {
  useEffect(() => {
    if (!nextMatchId) return;

    // Wait for hydration and layout to stabilize
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-match-id="${nextMatchId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [nextMatchId]);
}
