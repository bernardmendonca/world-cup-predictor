import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 15: After any sequence of team selections, only the most recent one is stored.
 * Tests the pure logic without database.
 */

interface PlayerSelections {
  favoriteTeamId: string | null;
  minnowTeamId: string | null;
}

class TeamSelectionStore {
  private selections = new Map<string, PlayerSelections>();

  selectFavorite(playerId: string, teamId: string): void {
    const current = this.selections.get(playerId) ?? {
      favoriteTeamId: null,
      minnowTeamId: null,
    };
    current.favoriteTeamId = teamId;
    this.selections.set(playerId, current);
  }

  selectMinnow(playerId: string, teamId: string): void {
    const current = this.selections.get(playerId) ?? {
      favoriteTeamId: null,
      minnowTeamId: null,
    };
    current.minnowTeamId = teamId;
    this.selections.set(playerId, current);
  }

  getSelections(playerId: string): PlayerSelections {
    return this.selections.get(playerId) ?? { favoriteTeamId: null, minnowTeamId: null };
  }
}

describe("Property 15: Single Team Selection", () => {
  const teamIdArb = fc.string({ minLength: 1, maxLength: 10 });
  const playerIdArb = fc.string({ minLength: 1, maxLength: 10 });

  it("after any sequence of favorite selections, only the most recent is stored", () => {
    fc.assert(
      fc.property(
        playerIdArb,
        fc.array(teamIdArb, { minLength: 1, maxLength: 20 }),
        (playerId, teamIds) => {
          const store = new TeamSelectionStore();

          for (const teamId of teamIds) {
            store.selectFavorite(playerId, teamId);
          }

          const selections = store.getSelections(playerId);
          expect(selections.favoriteTeamId).toBe(teamIds[teamIds.length - 1]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("after any sequence of minnow selections, only the most recent is stored", () => {
    fc.assert(
      fc.property(
        playerIdArb,
        fc.array(teamIdArb, { minLength: 1, maxLength: 20 }),
        (playerId, teamIds) => {
          const store = new TeamSelectionStore();

          for (const teamId of teamIds) {
            store.selectMinnow(playerId, teamId);
          }

          const selections = store.getSelections(playerId);
          expect(selections.minnowTeamId).toBe(teamIds[teamIds.length - 1]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("favorite and minnow selections are independent", () => {
    fc.assert(
      fc.property(playerIdArb, teamIdArb, teamIdArb, (playerId, favTeam, minnowTeam) => {
        const store = new TeamSelectionStore();

        store.selectFavorite(playerId, favTeam);
        store.selectMinnow(playerId, minnowTeam);

        const selections = store.getSelections(playerId);
        expect(selections.favoriteTeamId).toBe(favTeam);
        expect(selections.minnowTeamId).toBe(minnowTeam);
      }),
      { numRuns: 100 }
    );
  });
});
