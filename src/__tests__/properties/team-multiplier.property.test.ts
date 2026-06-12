import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateTeamMultiplier } from "@/lib/scoring/team-multiplier";

describe("Property 4: Team Multiplier Calculation", () => {
  const teamIdArb = fc.string({ minLength: 1, maxLength: 10 });

  it("neither team selected → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);
        const result = calculateTeamMultiplier(homeTeam, awayTeam, null, null, homeTeam, homeTeam, false, false);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("predicted winner does not match actual winner → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);
        // Player predicted home win, but away won
        const result = calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, homeTeam, awayTeam, false, false);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("predicted draw but actual is a win → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);
        // Predicted draw, actual home win — favorite is home
        const result = calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, null, homeTeam, true, false);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("predicted win but actual is a draw → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);
        // Predicted home win, actual draw — favorite is home
        const result = calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, homeTeam, null, false, true);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite predicted to win and actually won → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Favorite is home, predicted home win, home actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, homeTeam, homeTeam, false, false)).toBe(2);
        // Favorite is away, predicted away win, away actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, null, awayTeam, awayTeam, false, false)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("minnow predicted to win and actually won → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Minnow is home, predicted home win, home actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, homeTeam, homeTeam, homeTeam, false, false)).toBe(2);
        // Minnow is away, predicted away win, away actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, awayTeam, awayTeam, awayTeam, false, false)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite in match, predicted draw, actual draw → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Favorite is home, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, null, null, true, true)).toBe(2);
        // Favorite is away, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, null, null, null, true, true)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("minnow in match, predicted draw, actual draw → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Minnow is home, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, homeTeam, null, null, true, true)).toBe(2);
        // Minnow is away, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, null, awayTeam, null, null, true, true)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("same team is both favorite and minnow, predicted to win and won → multiplier is 4", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home team is both favorite and minnow, predicted home win, home won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, homeTeam, homeTeam, homeTeam, false, false)).toBe(4);
        // Away team is both favorite and minnow, predicted away win, away won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, awayTeam, awayTeam, awayTeam, false, false)).toBe(4);
      }),
      { numRuns: 100 }
    );
  });

  it("same team is both favorite and minnow, predicted draw, actual draw → multiplier is 4", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home team is both favorite and minnow, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, homeTeam, null, null, true, true)).toBe(4);
        // Away team is both favorite and minnow, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, awayTeam, null, null, true, true)).toBe(4);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite is in match but predicted the OTHER team to win → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Favorite is home, but predicted away win (and away won)
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, null, awayTeam, awayTeam, false, false)).toBe(1);
        // Favorite is away, but predicted home win (and home won)
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, null, homeTeam, homeTeam, false, false)).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("neither team in match is favorite or minnow → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, teamIdArb, teamIdArb, (home, away, fav, minnow) => {
        fc.pre(fav !== home && fav !== away);
        fc.pre(minnow !== home && minnow !== away);

        const result = calculateTeamMultiplier(home, away, fav, minnow, home, home, false, false);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("neither team in match is favorite or minnow, draw scenario → multiplier is 1", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, teamIdArb, teamIdArb, (home, away, fav, minnow) => {
        fc.pre(fav !== home && fav !== away);
        fc.pre(minnow !== home && minnow !== away);

        const result = calculateTeamMultiplier(home, away, fav, minnow, null, null, true, true);
        expect(result).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite and minnow are different teams in match, predicted winner is favorite and won → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home is favorite, away is minnow, predicted home win, home actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, awayTeam, homeTeam, homeTeam, false, false)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite and minnow are different teams in match, predicted winner is minnow and won → multiplier is 2", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home is favorite, away is minnow, predicted away win, away actually won
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, awayTeam, awayTeam, awayTeam, false, false)).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it("favorite and minnow are different teams in match, predicted draw, actual draw → multiplier is 4", () => {
    fc.assert(
      fc.property(teamIdArb, teamIdArb, (homeTeam, awayTeam) => {
        fc.pre(homeTeam !== awayTeam);

        // Home is favorite, away is minnow, predicted draw, actual draw — both are in the match
        expect(calculateTeamMultiplier(homeTeam, awayTeam, homeTeam, awayTeam, null, null, true, true)).toBe(4);
        // Away is favorite, home is minnow, predicted draw, actual draw
        expect(calculateTeamMultiplier(homeTeam, awayTeam, awayTeam, homeTeam, null, null, true, true)).toBe(4);
      }),
      { numRuns: 100 }
    );
  });
});
