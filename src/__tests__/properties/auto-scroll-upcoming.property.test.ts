import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { findNextUpcomingMatchId } from "@/lib/utils/next-upcoming-match";

describe("Auto-scroll to next upcoming match", () => {
  const matchStatusArb = fc.constantFrom("upcoming", "in_progress", "completed");

  const matchArb = fc.record({
    id: fc.uuid(),
    status: matchStatusArb,
  });

  it("returns the first non-completed match ID from an ordered list", () => {
    fc.assert(
      fc.property(fc.array(matchArb, { minLength: 1, maxLength: 50 }), (matches) => {
        const result = findNextUpcomingMatchId(matches);
        const firstNonCompleted = matches.find((m) => m.status !== "completed");

        if (firstNonCompleted) {
          expect(result).toBe(firstNonCompleted.id);
        } else {
          expect(result).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it("returns null when all matches are completed", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), status: fc.constant("completed") }),
          { minLength: 1, maxLength: 50 }
        ),
        (matches) => {
          const result = findNextUpcomingMatchId(matches);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns null when the list is empty", () => {
    const result = findNextUpcomingMatchId([]);
    expect(result).toBeNull();
  });

  it("returns the first match when none are completed", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom("upcoming", "in_progress"),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (matches) => {
          const result = findNextUpcomingMatchId(matches);
          expect(result).toBe(matches[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("skips completed matches at the start of the list", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom("upcoming", "in_progress"),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (completedCount, upcomingMatches) => {
          const completedMatches = Array.from({ length: completedCount }, (_, i) => ({
            id: `completed-${i}`,
            status: "completed" as const,
          }));
          const allMatches = [...completedMatches, ...upcomingMatches];

          const result = findNextUpcomingMatchId(allMatches);
          expect(result).toBe(upcomingMatches[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
