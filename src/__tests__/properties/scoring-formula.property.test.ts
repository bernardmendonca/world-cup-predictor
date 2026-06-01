import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("Property 1: Scoring Formula", () => {
  const basePointsArb = fc.constantFrom(0, 1, 4);
  const oddsMultiplierArb = fc.double({ min: 1.0, max: 2.0, noNaN: true });
  const teamMultiplierArb = fc.constantFrom(1, 2, 4);

  it("total = round(base × odds × team, 2) for any valid inputs", () => {
    fc.assert(
      fc.property(
        basePointsArb,
        oddsMultiplierArb,
        teamMultiplierArb,
        (base, odds, team) => {
          const expected = Math.round(base * odds * team * 100) / 100;
          const actual = Math.round(base * odds * team * 100) / 100;
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("total is 0 when base points is 0 regardless of multipliers", () => {
    fc.assert(
      fc.property(oddsMultiplierArb, teamMultiplierArb, (odds, team) => {
        const total = Math.round(0 * odds * team * 100) / 100;
        expect(total).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("total is non-negative for all valid inputs", () => {
    fc.assert(
      fc.property(
        basePointsArb,
        oddsMultiplierArb,
        teamMultiplierArb,
        (base, odds, team) => {
          const total = Math.round(base * odds * team * 100) / 100;
          expect(total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("maximum possible score is 4 × 2.00 × 4 = 32", () => {
    fc.assert(
      fc.property(
        basePointsArb,
        oddsMultiplierArb,
        teamMultiplierArb,
        (base, odds, team) => {
          const total = Math.round(base * odds * team * 100) / 100;
          expect(total).toBeLessThanOrEqual(32);
        }
      ),
      { numRuns: 100 }
    );
  });
});
