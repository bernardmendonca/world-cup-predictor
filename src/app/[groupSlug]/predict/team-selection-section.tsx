"use client";

import { useState } from "react";

interface Team {
  id: string;
  name: string;
  code: string;
  fifaRanking: number;
  groupLetter: string;
}

interface TeamSelections {
  favoriteTeamId: string | null;
  minnowTeamId: string | null;
}

interface Props {
  teams: Team[];
  selections: TeamSelections;
  selectionOpen: boolean;
  groupSlug: string;
  onSelectionsChange?: (selections: { favoriteTeamId: string | null; minnowTeamId: string | null }) => void;
}

// Minnow teams: FIFA ranking >= 44 (lower-ranked teams)
const MINNOW_MIN_RANKING = 44;

export function TeamSelectionSection({ teams, selections, selectionOpen, groupSlug, onSelectionsChange }: Props) {
  const [favoriteTeamId, setFavoriteTeamId] = useState<string>(selections.favoriteTeamId || "");
  const [minnowTeamId, setMinnowTeamId] = useState<string>(selections.minnowTeamId || "");

  // Sort teams by FIFA ranking for dropdowns
  const teamsByRank = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking);

  // Filter minnow teams: only teams with FIFA ranking >= 44
  const minnowTeams = teamsByRank.filter((t) => t.fifaRanking >= MINNOW_MIN_RANKING);

  const favoriteTeam = teams.find((t) => t.id === favoriteTeamId);
  const minnowTeam = teams.find((t) => t.id === minnowTeamId);

  const noFavorite = !favoriteTeamId;
  const noMinnow = !minnowTeamId;
  const hasMissingSelection = selectionOpen && (noFavorite || noMinnow);

  function handleFavoriteChange(value: string) {
    setFavoriteTeamId(value);
    onSelectionsChange?.({ favoriteTeamId: value || null, minnowTeamId: minnowTeamId || null });
  }

  function handleMinnowChange(value: string) {
    setMinnowTeamId(value);
    onSelectionsChange?.({ favoriteTeamId: favoriteTeamId || null, minnowTeamId: value || null });
  }

  return (
    <div
      className={`rounded border p-4 mb-6 ${
        hasMissingSelection
          ? "border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-semibold dark:text-white">Your Team Selections</h2>
        {hasMissingSelection && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            ℹ️ {noFavorite && noMinnow ? "Select favorite & minnow teams" : noFavorite ? "Select favorite team" : "Select minnow team"}
          </span>
        )}
      </div>

      {!selectionOpen && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">Selection window is closed.</p>
      )}

      {selectionOpen ? (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Favorite team dropdown */}
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Favorite Team <span className="text-blue-600 dark:text-blue-400">(2x multiplier)</span>
            </label>
            <select
              value={favoriteTeamId}
              onChange={(e) => handleFavoriteChange(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 ${
                noFavorite
                  ? "border-amber-300 dark:border-amber-600"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <option value="">Select favorite team...</option>
              {teamsByRank.map((team) => (
                <option key={team.id} value={team.id}>
                  #{team.fifaRanking} — {team.name} ({team.code})
                </option>
              ))}
            </select>
          </div>

          {/* Minnow team dropdown */}
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Minnow Team <span className="text-green-600 dark:text-green-400">(2x multiplier)</span>
            </label>
            <select
              value={minnowTeamId}
              onChange={(e) => handleMinnowChange(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 ${
                noMinnow
                  ? "border-amber-300 dark:border-amber-600"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <option value="">Select minnow team...</option>
              {minnowTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  #{team.fifaRanking} — {team.name} ({team.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Favorite: </span>
            <span className="font-medium text-sm text-blue-600 dark:text-blue-400">
              {favoriteTeam ? `${favoriteTeam.name} (${favoriteTeam.code}) — #${favoriteTeam.fifaRanking}` : "Not selected"}
            </span>
          </div>
          <div className="flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Minnow: </span>
            <span className="font-medium text-sm text-green-600 dark:text-green-400">
              {minnowTeam ? `${minnowTeam.name} (${minnowTeam.code}) — #${minnowTeam.fifaRanking}` : "Not selected"}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Team selections are saved with the &quot;Save All Predictions&quot; button below.
        {selectionOpen && " Both selections can be the same team (4x multiplier)."}
      </p>
    </div>
  );
}
