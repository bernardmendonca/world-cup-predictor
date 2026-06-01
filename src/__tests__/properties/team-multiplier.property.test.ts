import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateTeamMultiplier } from "@/lib/scoring/team-multiplier";

describe("Property 4: Team Multiplier Calculation", () => {
  const teamIdArb = fc.string({ minLength: 1, maxLength: 10 });

  it("neither team selected → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        const result = calculateTeamMultiplier(homeTeam, awayTeam, null, null);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("one team is favorite XOR minnow → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Favorite is home, no minnow
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null)).toBe(2);
        // Minnow is away, no favorite
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, awayTeam)).toBe(2);
        // Favorite is away, no minnow
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, null)).toBe(2);
        // Minnow is home, no favorite
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, homeTeam)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("same team is both favorite and minnow → multiplier is 4", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Same team is both favorite and minnow (home team)
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, homeTeam)).toBe(4);
        // Same team is both favorite and minnow (away team)
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, awayTeam)).toBe(4);
      }),
      { numRuns: 100 }
    );
  });

  it("one team favorite, other team minnow → multiplier is 4", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home is favorite, away is minnow
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, awayTeam)).toBe(4);
        // Away is favorite, home is minnow
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, homeTeam)).toBe(4);
      }),
      { numRuns: 100 }
    );
  });

  it("neither team in match → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, teamIdArb, teamIdArb, (home, away, fav, minnow) => {
        fc.pre(fav !== home && fav !== away);
        fc.pre(minnow !== home && minnow !== away);

        const result = calculateTeamMultiplier(home, away, fav, minnow);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});
