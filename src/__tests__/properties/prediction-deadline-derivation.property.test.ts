import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getPredictionDeadline } from "@/lib/utils/time";

describe("Property 12: Prediction Deadline Derivation", () => {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  const kickoffArb = fc.date({
    min: new Date("2026-06-01T00:00:00Z"),
    max: new Date("2026-08-01T00:00:00Z"),
  });

  it("deadline = kickoff - exactly 2 hours for any kickoff time", () => {
    fc.assert(
      fc.property(kickoffArb, (kickoff) => {
        const deadline = getPredictionDeadline(kickoff);
        const diff = kickoff.getTime() - deadline.getTime();
        expect(diff).toBe(TWO_HOURS_MS);
      }),
      { numRuns: 100 }
    );
  });

  it("deadline is always before kickoff", () => {
    fc.assert(
      fc.property(kickoffArb, (kickoff) => {
        const deadline = getPredictionDeadline(kickoff);
        expect(deadline.getTime()).toBeLessThan(kickoff.getTime());
      }),
      { numRuns: 100 }
    );
  });

  it("deadline is a valid Date object", () => {
    fc.assert(
      fc.property(kickoffArb, (kickoff) => {
        const deadline = getPredictionDeadline(kickoff);
        expect(deadline).toBeInstanceOf(Date);
        expect(isNaN(deadline.getTime())).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
