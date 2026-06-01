/**
 * Get the current time. In test mode, this can be overridden.
 */
let timeOverride: Date | null = null;

export function getCurrentTime(): Date {
  return timeOverride ?? new Date();
}

export function setTimeOverride(time: Date | null): void {
  timeOverride = time;
}

/**
 * Calculate prediction deadline: 2 hours before kickoff.
 */
export function getPredictionDeadline(kickoffTime: Date): Date {
  return new Date(kickoffTime.getTime() - 2 * 60 * 60 * 1000);
}

/**
 * Check if predictions are still open for a match.
 */
export function isPredictionOpen(kickoffTime: Date): boolean {
  const deadline = getPredictionDeadline(kickoffTime);
  return getCurrentTime() < deadline;
}
