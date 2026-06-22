"use client";

import { useState } from "react";

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  favoriteTeam: string | null;
  minnowTeam: string | null;
  groupStagePoints: number;
  knockoutPoints: number;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
}

type SortColumn = "rank" | "playerName" | "favoriteTeam" | "minnowTeam" | "groupStagePoints" | "knockoutPoints" | "totalPoints" | "exactScores" | "correctResults";
type SortDirection = "asc" | "desc";

interface Props {
  entries: LeaderboardEntry[];
}

const COLUMN_TOOLTIPS: Record<SortColumn, string> = {
  rank: "Leaderboard position based on total points",
  playerName: "Player name",
  favoriteTeam: "Favourite team — earns a 2× multiplier when this team wins and you predicted it",
  minnowTeam: "Minnow team — earns a 2× multiplier when this team wins and you predicted it",
  groupStagePoints: "Total points earned from group stage matches",
  knockoutPoints: "Total points earned from knockout stage matches",
  totalPoints: "Combined points from all scored matches (group + knockout)",
  exactScores: "Number of matches where the exact final score was predicted correctly",
  correctResults: "Number of matches where the correct outcome (win/draw/loss) was predicted, excluding exact scores",
};

export function LeaderboardTable({ entries }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      // Default direction: desc for points/counts, asc for rank/name/teams
      setSortDirection(column === "playerName" || column === "rank" || column === "favoriteTeam" || column === "minnowTeam" ? "asc" : "desc");
    }
  }

  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortColumn) {
      case "rank":
        cmp = a.rank - b.rank;
        break;
      case "playerName":
        cmp = a.playerName.localeCompare(b.playerName);
        break;
      case "favoriteTeam":
        cmp = (a.favoriteTeam || "ZZZ").localeCompare(b.favoriteTeam || "ZZZ");
        break;
      case "minnowTeam":
        cmp = (a.minnowTeam || "ZZZ").localeCompare(b.minnowTeam || "ZZZ");
        break;
      case "groupStagePoints":
        cmp = a.groupStagePoints - b.groupStagePoints;
        break;
      case "knockoutPoints":
        cmp = a.knockoutPoints - b.knockoutPoints;
        break;
      case "totalPoints":
        cmp = a.totalPoints - b.totalPoints;
        break;
      case "exactScores":
        cmp = a.exactScores - b.exactScores;
        break;
      case "correctResults":
        cmp = a.correctResults - b.correctResults;
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  function SortIndicator({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  function HeaderCell({ column, label, alignRight = false }: { column: SortColumn; label: string; alignRight?: boolean }) {
    return (
      <th
        className={`px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none relative group ${alignRight ? "text-right" : ""}`}
        onClick={() => handleSort(column)}
      >
        {label}<SortIndicator column={column} />
        <div className={`absolute hidden group-hover:block z-10 top-full ${alignRight ? "right-0" : "left-0"} mt-1 w-56 p-2 bg-gray-800 text-white text-xs font-normal rounded shadow-lg leading-relaxed pointer-events-none`}>
          {COLUMN_TOOLTIPS[column]}
        </div>
      </th>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-750">
          <tr className="text-left">
            <HeaderCell column="rank" label="#" />
            <HeaderCell column="playerName" label="Player" />
            <HeaderCell column="totalPoints" label="Total" alignRight />
            <HeaderCell column="groupStagePoints" label="Group" alignRight />
            <HeaderCell column="knockoutPoints" label="Knockout" alignRight />
            <HeaderCell column="exactScores" label="Exact" alignRight />
            <HeaderCell column="correctResults" label="Results" alignRight />
            <HeaderCell column="favoriteTeam" label="Fav" />
            <HeaderCell column="minnowTeam" label="Minnow" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.playerId} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-4 py-3 font-bold text-gray-400 dark:text-gray-500">
                {entry.rank}
              </td>
              <td className="px-4 py-3 font-medium dark:text-gray-100">
                {entry.playerName}
              </td>
              <td className="px-4 py-3 text-right font-bold dark:text-gray-100">
                {entry.totalPoints.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {entry.groupStagePoints.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {entry.knockoutPoints.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-purple-700 dark:text-purple-400">
                {entry.exactScores}
              </td>
              <td className="px-4 py-3 text-right font-medium text-blue-700 dark:text-blue-400">
                {entry.correctResults}
              </td>
              <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                {entry.favoriteTeam || "—"}
              </td>
              <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                {entry.minnowTeam || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
