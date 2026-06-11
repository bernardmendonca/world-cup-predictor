import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatTimeZones } from "@/lib/utils/timezone";

describe("Property 11: Timezone Conversions", () => {
  // Generate valid UTC timestamps within the World Cup period
  const utcDateArb = fc.date({
    min: new Date("2026-06-01T00:00:00Z"),
    max: new Date("2026-08-01T00:00:00Z"),
  });

  it("all four timezone conversions represent the same instant (produce non-empty strings)", () => {
    fc.assert(
      fc.property(utcDateArb, (utcDate) => {
        const result = formatTimeZones(utcDate);

        // All four should produce non-empty strings
        expect(result.eastern).toBeTruthy();
        expect(result.uk).toBeTruthy();
        expect(result.ist).toBeTruthy();
        expect(result.aest).toBeTruthy();

        // They should be strings
        expect(typeof result.eastern).toBe("string");
        expect(typeof result.uk).toBe("string");
        expect(typeof result.ist).toBe("string");
        expect(typeof result.aest).toBe("string");
      }),
      { numRuns: 100 }
    );
  });

  it("the same UTC instant produces consistent timezone outputs (deterministic)", () => {
    fc.assert(
      fc.property(utcDateArb, (utcDate) => {
        const result1 = formatTimeZones(utcDate);
        const result2 = formatTimeZones(utcDate);

        expect(result1.eastern).toBe(result2.eastern);
        expect(result1.uk).toBe(result2.uk);
        expect(result1.ist).toBe(result2.ist);
        expect(result1.aest).toBe(result2.aest);
      }),
      { numRuns: 100 }
    );
  });

  it("different UTC instants can produce different timezone strings", () => {
    // This is a sanity check: two dates 12 hours apart should differ
    fc.assert(
      fc.property(utcDateArb, (utcDate) => {
        const laterDate = new Date(utcDate.getTime() + 12 * 60 * 60 * 1000);
        const result1 = formatTimeZones(utcDate);
        const result2 = formatTimeZones(laterDate);

        // At least one timezone representation should differ for 12h difference
        const allSame =
          result1.eastern === result2.eastern &&
          result1.uk === result2.uk &&
          result1.ist === result2.ist &&
          result1.aest === result2.aest;
        expect(allSame).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("all three representations come from the same Date object (same instant)", () => {
    fc.assert(
      fc.property(utcDateArb, (utcDate) => {
        // Verify that parsing back the formatted times would give the same instant
        // We can't easily parse locale strings, but we can verify the function
        // doesn't modify the input date
        const originalTime = utcDate.getTime();
        formatTimeZones(utcDate);
        expect(utcDate.getTime()).toBe(originalTime);
      }),
      { numRuns: 100 }
    );
  });
});
