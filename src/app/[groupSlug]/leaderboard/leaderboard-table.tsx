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
}

type SortColumn = "rank" | "playerName" | "favoriteTeam" | "minnowTeam" | "groupStagePoints" | "knockoutPoints" | "totalPoints";
type SortDirection = "asc" | "desc";

interface Props {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      // Default direction: desc for points, asc for rank/name/teams
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
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  function SortIndicator({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-750">
          <tr className="text-left">
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("rank")}
            >
              #<SortIndicator column="rank" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("playerName")}
            >
              Player<SortIndicator column="playerName" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("favoriteTeam")}
            >
              Fav<SortIndicator column="favoriteTeam" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("minnowTeam")}
            >
              Minnow<SortIndicator column="minnowTeam" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("groupStagePoints")}
            >
              Group<SortIndicator column="groupStagePoints" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("knockoutPoints")}
            >
              Knockout<SortIndicator column="knockoutPoints" />
            </th>
            <th
              className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort("totalPoints")}
            >
              Total<SortIndicator column="totalPoints" />
            </th>
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
              <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                {entry.favoriteTeam || "—"}
              </td>
              <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                {entry.minnowTeam || "—"}
              </td>
              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {entry.groupStagePoints.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                {entry.knockoutPoints.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-bold dark:text-gray-100">
                {entry.totalPoints.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
