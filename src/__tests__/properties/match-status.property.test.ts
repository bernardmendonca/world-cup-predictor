import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { deriveMatchStatus } from "@/lib/matches/match-service";
import { setTimeOverride } from "@/lib/utils/time";
import { afterEach } from "vitest";

describe("Property 13: Match Status Derivation", () => {
  const scoreArb = fc.integer({ min: 0, max: 20 });
  const kickoffArb = fc.date({
    min: new Date("2026-06-01T00:00:00Z"),
    max: new Date("2026-08-01T00:00:00Z"),
  });

  afterEach(() => {
    setTimeOverride(null);
  });

  it("result exists → status is 'completed'", () => {
    fc.assert(
      fc.property(kickoffArb, scoreArb, scoreArb, (kickoff, homeScore, awayScore) => {
        // When result exists (non-null scores), status is completed regardless of time
        const status = deriveMatchStatus(kickoff, homeScore, awayScore);
        expect(status).toBe("completed");
      }),
      { numRuns: 100 }
    );
  });

  it("no result and current time >= kickoff → status is 'in_progress'", () => {
    fc.assert(
      fc.property(
        kickoffArb,
        fc.integer({ min: 0, max: 100000000 }),
        (kickoff, offsetMs) => {
          // Set current time to be at or after kickoff
          const currentTime = new Date(kickoff.getTime() + offsetMs);
          setTimeOverride(currentTime);

          const status = deriveMatchStatus(kickoff, null, null);
          expect(status).toBe("in_progress");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no result and current time < kickoff → status is 'upcoming'", () => {
    fc.assert(
      fc.property(
        kickoffArb,
        fc.integer({ min: 1, max: 100000000 }),
        (kickoff, offsetMs) => {
          // Set current time to be before kickoff
          const currentTime = new Date(kickoff.getTime() - offsetMs);
          setTimeOverride(currentTime);

          const status = deriveMatchStatus(kickoff, null, null);
          expect(status).toBe("upcoming");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("status is always one of the three valid values", () => {
    fc.assert(
      fc.property(
        kickoffArb,
        fc.option(scoreArb, { nil: null }),
        fc.option(scoreArb, { nil: null }),
        (kickoff, homeScore, awayScore) => {
          // Set a random time
          setTimeOverride(new Date("2026-07-01T12:00:00Z"));
          const status = deriveMatchStatus(kickoff, homeScore, awayScore);
          expect(["upcoming", "in_progress", "completed"]).toContain(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});
