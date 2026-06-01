import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateOddsMultipliers } from "@/lib/scoring/odds-multiplier";

describe("Property 3: Odds Multiplier Calculation", () => {
  const countArb = fc.integer({ min: 0, max: 50 });

  it("multiplier = round(2 - count/total, 2) for outcomes with predictions", () => {
    fc.assert(
      fc.property(countArb, countArb, countArb, (homeWin, awayWin, draw) => {
        const total = homeWin + awayWin + draw;
        fc.pre(total > 0);

        const result = calculateOddsMultipliers(homeWin, awayWin, draw);

        if (homeWin > 0) {
          const expected = Math.round((2 - homeWin / total) * 100) / 100;
          expect(result.homeWin).toBeCloseTo(expected, 2);
        }
        if (awayWin > 0) {
          const expected = Math.round((2 - awayWin / total) * 100) / 100;
          expect(result.awayWin).toBeCloseTo(expected, 2);
        }
        if (draw > 0) {
          const expected = Math.round((2 - draw / total) * 100) / 100;
          expect(result.draw).toBeCloseTo(expected, 2);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("multiplier = 0 for outcomes with no predictions", () => {
    fc.assert(
      fc.property(countArb, countArb, countArb, (homeWin, awayWin, draw) => {
        const total = homeWin + awayWin + draw;
        fc.pre(total > 0);

        const result = calculateOddsMultipliers(homeWin, awayWin, draw);

        if (homeWin === 0) expect(result.homeWin).toBe(0);
        if (awayWin === 0) expect(result.awayWin).toBe(0);
        if (draw === 0) expect(result.draw).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("all non-zero multipliers are in [1.00, 2.00]", () => {
    fc.assert(
      fc.property(countArb, countArb, countArb, (homeWin, awayWin, draw) => {
        const total = homeWin + awayWin + draw;
        fc.pre(total > 0);

        const result = calculateOddsMultipliers(homeWin, awayWin, draw);

        for (const val of [result.homeWin, result.awayWin, result.draw]) {
          if (val !== 0) {
            expect(val).toBeGreaterThanOrEqual(1.0);
            expect(val).toBeLessThanOrEqual(2.0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("all zeros when total is 0", () => {
    const result = calculateOddsMultipliers(0, 0, 0);
    expect(result.homeWin).toBe(0);
    expect(result.awayWin).toBe(0);
    expect(result.draw).toBe(0);
  });
});
