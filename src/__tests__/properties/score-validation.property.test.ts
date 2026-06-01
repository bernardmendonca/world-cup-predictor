import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Pure score validation logic extracted for testing.
 * Mirrors the isValidScore function in group-predictions.ts and knockout-predictions.ts.
 */
function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 20;
}

describe("Property 14: Score Validation", () => {
  it("integer values 0-20 are accepted", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (score) => {
        expect(isValidScore(score)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("negative integers are rejected", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: -1 }), (score) => {
        expect(isValidScore(score)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("integers greater than 20 are rejected", () => {
    fc.assert(
      fc.property(fc.integer({ min: 21, max: 1000 }), (score) => {
        expect(isValidScore(score)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("non-integer numbers are rejected", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 20, noNaN: true }),
        (score) => {
          fc.pre(!Number.isInteger(score));
          expect(isValidScore(score)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("NaN is rejected", () => {
    expect(isValidScore(NaN)).toBe(false);
  });

  it("Infinity is rejected", () => {
    expect(isValidScore(Infinity)).toBe(false);
    expect(isValidScore(-Infinity)).toBe(false);
  });
});
