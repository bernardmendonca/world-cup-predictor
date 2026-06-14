/**
 * Finds the ID of the first match that has not been completed (status !== "completed")
 * from a list of matches ordered by kickoff time.
 *
 * Returns null if all matches are completed or the list is empty.
 */
export function findNextUpcomingMatchId(
  matches: Array<{ id: string; status: string }>
): string | null {
  const next = matches.find((m) => m.status !== "completed");
  return next?.id ?? null;
}
