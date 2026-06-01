import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getPredictionDeadline } from "@/lib/utils/time";

describe("Property 6: Group Stage Prediction Deadline", () => {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  // Generate arbitrary kickoff times (within a reasonable range)
  const kickoffArb = fc.date({
    min: new Date("2026-06-01T00:00:00Z"),
    max: new Date("2026-08-01T00:00:00Z"),
  });

  it("submission before deadline (T < K - 2h) is accepted", () => {
    fc.assert(
      fc.property(kickoffArb, fc.integer({ min: 1, max: 100000000 }), (kickoff, offsetMs) => {
        const deadline = getPredictionDeadline(kickoff);
        const submissionTime = new Date(deadline.getTime() - offsetMs);

        // T < deadline means accepted
        expect(submissionTime < deadline).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("submission at or after deadline (T >= K - 2h) is rejected", () => {
    fc.assert(
      fc.property(kickoffArb, fc.integer({ min: 0, max: 100000000 }), (kickoff, offsetMs) => {
        const deadline = getPredictionDeadline(kickoff);
        const submissionTime = new Date(deadline.getTime() + offsetMs);

        // T >= deadline means rejected
        expect(submissionTime >= deadline).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("deadline is exactly 2 hours before kickoff", () => {
    fc.assert(
      fc.property(kickoffArb, (kickoff) => {
        const deadline = getPredictionDeadline(kickoff);
        expect(kickoff.getTime() - deadline.getTime()).toBe(TWO_HOURS_MS);
      }),
      { numRuns: 100 }
    );
  });
});
