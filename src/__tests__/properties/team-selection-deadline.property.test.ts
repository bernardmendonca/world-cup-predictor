import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 8: Team selection deadline.
 * For first match kickoff F and timestamp T:
 * - T < F - 2 hours → accepted
 * - T ≥ F - 2 hours → rejected
 */

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getTeamSelectionDeadline(firstMatchKickoff: Date): Date {
  return new Date(firstMatchKickoff.getTime() - TWO_HOURS_MS);
}

function isTeamSelectionOpen(firstMatchKickoff: Date, currentTime: Date): boolean {
  const deadline = getTeamSelectionDeadline(firstMatchKickoff);
  return currentTime < deadline;
}

describe("Property 8: Team Selection Deadline", () => {
  const kickoffArb = fc.date({
    min: new Date("2026-06-11T00:00:00Z"),
    max: new Date("2026-06-11T23:59:59Z"),
  });

  it("submission before deadline (T < F - 2h) is accepted", () => {
    fc.assert(
      fc.property(kickoffArb, fc.integer({ min: 1, max: 100000000 }), (kickoff, offsetMs) => {
        const deadline = getTeamSelectionDeadline(kickoff);
        const submissionTime = new Date(deadline.getTime() - offsetMs);

        expect(isTeamSelectionOpen(kickoff, submissionTime)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("submission at or after deadline (T >= F - 2h) is rejected", () => {
    fc.assert(
      fc.property(kickoffArb, fc.integer({ min: 0, max: 100000000 }), (kickoff, offsetMs) => {
        const deadline = getTeamSelectionDeadline(kickoff);
        const submissionTime = new Date(deadline.getTime() + offsetMs);

        expect(isTeamSelectionOpen(kickoff, submissionTime)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("deadline is exactly 2 hours before first match kickoff", () => {
    fc.assert(
      fc.property(kickoffArb, (kickoff) => {
        const deadline = getTeamSelectionDeadline(kickoff);
        expect(kickoff.getTime() - deadline.getTime()).toBe(TWO_HOURS_MS);
      }),
      { numRuns: 100 }
    );
  });
});
