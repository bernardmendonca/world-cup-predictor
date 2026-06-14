"use client";

import { useState } from "react";
import { useScrollToUpcoming } from "@/lib/hooks/use-scroll-to-upcoming";
import type { AdminMatchData } from "./admin-batch-form";

interface Props {
  matches: AdminMatchData[];
  groupSlug: string;
  nextUpcomingMatchId: string | null;
}

function toLocalDatetimeValue(isoString: string): string {
  // Convert UTC ISO string to local datetime-local input value
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function KickoffTimesForm({ matches, groupSlug, nextUpcomingMatchId }: Props) {
  const [times, setTimes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const match of matches) {
      initial[match.id] = toLocalDatetimeValue(match.kickoffTime);
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ success: number; failed: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "group" | "knockout">("all");

  useScrollToUpcoming(nextUpcomingMatchId);

  const filteredMatches = matches.filter((m) => {
    if (filter === "group") return m.stage === "group";
    if (filter === "knockout") return m.stage === "knockout";
    return true;
  });

  function handleChange(matchId: string, value: string) {
    setTimes((prev) => ({ ...prev, [matchId]: value }));
    setOutcome(null);
  }

  // Determine which matches have been changed
  const changedMatches = filteredMatches.filter((match) => {
    const original = toLocalDatetimeValue(match.kickoffTime);
    return times[match.id] !== original;
  });

  async function handleSubmit() {
    if (changedMatches.length === 0) return;

    setSaving(true);
    setOutcome(null);

    const updates = changedMatches.map((match) => ({
      matchId: match.id,
      // Convert local datetime-local value back to ISO/UTC
      kickoffTime: new Date(times[match.id]).toISOString(),
    }));

    try {
      const res = await fetch(`/api/${groupSlug}/admin/kickoff-times`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const data = await res.json();
        setOutcome({ success: data.success, failed: data.failed });
      } else {
        setOutcome({ success: 0, failed: changedMatches.length });
      }
    } catch {
      setOutcome({ success: 0, failed: changedMatches.length });
    }

    setSaving(false);
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        Update kickoff times for matches. Changes affect when predictions get locked.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-2 py-1 rounded text-xs ${filter === "all" ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          All ({matches.length})
        </button>
        <button
          onClick={() => setFilter("group")}
          className={`px-2 py-1 rounded text-xs ${filter === "group" ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Group ({matches.filter((m) => m.stage === "group").length})
        </button>
        <button
          onClick={() => setFilter("knockout")}
          className={`px-2 py-1 rounded text-xs ${filter === "knockout" ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"}`}
        >
          Knockout ({matches.filter((m) => m.stage === "knockout").length})
        </button>
      </div>

      {changedMatches.length > 0 && (
        <p className="text-sm text-purple-600 dark:text-purple-400 mb-3 font-medium">
          {changedMatches.length} match{changedMatches.length !== 1 ? "es" : ""} modified
        </p>
      )}

      <div className="space-y-1">
        {filteredMatches.map((match) => {
          const original = toLocalDatetimeValue(match.kickoffTime);
          const isChanged = times[match.id] !== original;

          return (
            <div
              key={match.id}
              data-match-id={match.id}
              className={`p-3 rounded border scroll-mt-24 ${
                isChanged
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">#{match.matchNumber}</span>
                    <span className="text-xs text-gray-400">
                      {match.groupLetter
                        ? `Grp ${match.groupLetter}`
                        : match.knockoutRound?.replace(/_/g, " ")}
                    </span>
                    {isChanged && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        • changed
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-sm mt-0.5">
                    {match.homeTeamName} vs {match.awayTeamName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={times[match.id]}
                    onChange={(e) => handleChange(match.id, e.target.value)}
                    className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                  {isChanged && (
                    <button
                      type="button"
                      onClick={() => handleChange(match.id, original)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Reset to original"
                    >
                      ↩
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-4 -mx-4 flex items-center justify-between">
        <div>
          {outcome && (
            <span
              className={`text-sm ${outcome.failed > 0 ? "text-amber-600" : "text-green-600"}`}
            >
              {outcome.success > 0 && `${outcome.success} kickoff time${outcome.success !== 1 ? "s" : ""} updated`}
              {outcome.success > 0 && outcome.failed > 0 && ", "}
              {outcome.failed > 0 && `${outcome.failed} failed`}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || changedMatches.length === 0}
          className={`px-6 py-2 rounded font-medium ${
            saving || changedMatches.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {saving ? "Saving..." : "Save Kickoff Times"}
        </button>
      </div>
    </div>
  );
}
