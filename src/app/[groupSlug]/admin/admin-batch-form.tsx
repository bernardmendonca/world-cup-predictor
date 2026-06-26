"use client";

import { useState } from "react";
import { useScrollToUpcoming } from "@/lib/hooks/use-scroll-to-upcoming";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";

export interface AdminMatchData {
  id: string;
  matchNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  stage: string;
  knockoutRound: string | null;
  groupLetter: string | null;
  kickoffTime: string;
  venue: string;
  status: string;
  existingHomeScore: number | null;
  existingAwayScore: number | null;
  existingPenaltyWinner: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
  predictedCount: number;
  totalPlayers: number;
  deadlineOpen: boolean;
  missingPlayerNames: string[];
}

interface TeamOption {
  id: string;
  name: string;
  code: string;
}

interface Props {
  matches: AdminMatchData[];
  teams: TeamOption[];
  groupSlug: string;
  groupId: string;
  section: string;
  nextUpcomingMatchId: string | null;
}

interface ResultEntry {
  homeScore: string;
  awayScore: string;
  penaltyWinner: string | null;
}

interface AssignEntry {
  homeTeamId: string;
  awayTeamId: string;
}

export function AdminBatchForm({ matches, teams, groupSlug, groupId, section, nextUpcomingMatchId }: Props) {
  if (section === "knockout") {
    return <KnockoutAssignSection matches={matches} teams={teams} groupSlug={groupSlug} nextUpcomingMatchId={nextUpcomingMatchId} />;
  }
  return <ResultsSection matches={matches} groupSlug={groupSlug} groupId={groupId} nextUpcomingMatchId={nextUpcomingMatchId} />;
}

function ResultsSection({
  matches,
  groupSlug,
  groupId,
  nextUpcomingMatchId,
}: {
  matches: AdminMatchData[];
  groupSlug: string;
  groupId: string;
  nextUpcomingMatchId: string | null;
}) {
  // Only show matches that have teams confirmed (can have results)
  const eligibleMatches = matches.filter(
    (m) => m.homeTeamId != null && m.awayTeamId != null
  );

  useScrollToUpcoming(nextUpcomingMatchId);

  const initialState: Record<string, ResultEntry> = {};
  for (const match of eligibleMatches) {
    initialState[match.id] = {
      homeScore: match.existingHomeScore != null ? String(match.existingHomeScore) : "",
      awayScore: match.existingAwayScore != null ? String(match.existingAwayScore) : "",
      penaltyWinner: match.existingPenaltyWinner,
    };
  }

  const [results, setResults] = useState<Record<string, ResultEntry>>(initialState);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ success: number; failed: number } | null>(null);

  function updateResult(matchId: string, field: keyof ResultEntry, value: string | null) {
    setResults((prev) => {
      const entry = { ...prev[matchId], [field]: value };
      if (field === "homeScore" || field === "awayScore") {
        const h = field === "homeScore" ? value : entry.homeScore;
        const a = field === "awayScore" ? value : entry.awayScore;
        if (h !== "" && a !== "" && h !== a) {
          entry.penaltyWinner = null;
        }
      }
      return { ...prev, [matchId]: entry };
    });
    setOutcome(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setOutcome(null);
    let success = 0;
    let failed = 0;

    for (const match of eligibleMatches) {
      const entry = results[match.id];
      if (!entry || entry.homeScore === "" || entry.awayScore === "") continue;

      const homeScore = parseInt(entry.homeScore, 10);
      const awayScore = parseInt(entry.awayScore, 10);
      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      // Skip if unchanged
      if (
        match.existingHomeScore === homeScore &&
        match.existingAwayScore === awayScore &&
        match.existingPenaltyWinner === entry.penaltyWinner
      ) {
        continue;
      }

      // Knockout with equal scores needs penalty winner
      if (match.stage === "knockout" && homeScore === awayScore && !entry.penaltyWinner) {
        failed++;
        continue;
      }

      try {
        const res = await fetch(`/api/${groupSlug}/admin/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            groupId,
            homeScore,
            awayScore,
            penaltyWinner: homeScore === awayScore ? entry.penaltyWinner : null,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setSaving(false);
    setOutcome({ success, failed });
  }

  const hasChanges = eligibleMatches.some((match) => {
    const entry = results[match.id];
    if (!entry || entry.homeScore === "" || entry.awayScore === "") return false;
    const h = parseInt(entry.homeScore, 10);
    const a = parseInt(entry.awayScore, 10);
    if (isNaN(h) || isNaN(a)) return false;
    return (
      match.existingHomeScore !== h ||
      match.existingAwayScore !== a ||
      match.existingPenaltyWinner !== entry.penaltyWinner
    );
  });

  const completedCount = eligibleMatches.filter((m) => m.status === "completed").length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {completedCount} of {eligibleMatches.length} results recorded
      </p>

      <div className="space-y-1">
        {eligibleMatches.map((match) => {
          const entry = results[match.id];
          const isKnockout = match.stage === "knockout";
          const scoresEqual =
            entry.homeScore !== "" &&
            entry.awayScore !== "" &&
            entry.homeScore === entry.awayScore;
          const isCompleted = match.status === "completed";

          return (
            <div
              key={match.id}
              data-match-id={match.id}
              className={`p-3 rounded border scroll-mt-24 ${isCompleted ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">#{match.matchNumber}</span>
                    <span className="text-xs text-gray-400">
                      {match.groupLetter ? `Grp ${match.groupLetter}` : match.knockoutRound?.replace(/_/g, " ")}
                    </span>
                    {isCompleted && <span className="text-xs text-green-600">✓ recorded</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-sm w-[120px] text-right truncate">
                      {match.homeTeamName}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={entry.homeScore}
                        onChange={(e) => updateResult(match.id, "homeScore", e.target.value)}
                        className="w-10 h-8 text-center border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        placeholder="-"
                      />
                      <span className="text-gray-400 text-xs">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={entry.awayScore}
                        onChange={(e) => updateResult(match.id, "awayScore", e.target.value)}
                        className="w-10 h-8 text-center border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        placeholder="-"
                      />
                    </div>
                    <span className="font-medium text-sm w-[120px] truncate">
                      {match.awayTeamName}
                    </span>
                  </div>
                </div>

                {isKnockout && scoresEqual && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500">Pen:</span>
                    <button
                      type="button"
                      onClick={() => updateResult(match.id, "penaltyWinner", "home")}
                      className={`px-2 py-1 rounded ${
                        entry.penaltyWinner === "home" ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    >
                      {match.homeTeamCode || "H"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateResult(match.id, "penaltyWinner", "away")}
                      className={`px-2 py-1 rounded ${
                        entry.penaltyWinner === "away" ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    >
                      {match.awayTeamCode || "A"}
                    </button>
                  </div>
                )}

                {/* Prediction status chip */}
                {match.totalPlayers > 0 && (
                  <PredictionStatusChip
                    predictedCount={match.predictedCount}
                    totalPlayers={match.totalPlayers}
                    deadlineOpen={match.deadlineOpen}
                    missingPlayerNames={match.missingPlayerNames}
                  />
                )}
              </div>

              {/* Missing names expanded inline when deadline is open and predictions incomplete */}
              {match.deadlineOpen && match.missingPlayerNames.length > 0 && (
                <div className={`mt-2 text-xs rounded px-2 py-1.5 border ${
                  match.predictedCount === 0
                    ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900"
                }`}>
                  <span className="font-medium">Missing:</span>{" "}
                  {match.missingPlayerNames.join(", ")}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-1">
                {new Date(match.kickoffTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {match.stage}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-4 -mx-4 flex items-center justify-between">
        <div>
          {outcome && (
            <span className={`text-sm ${outcome.failed > 0 ? "text-amber-600" : "text-green-600"}`}>
              {outcome.success > 0 && `${outcome.success} results saved & scores calculated`}
              {outcome.success > 0 && outcome.failed > 0 && ", "}
              {outcome.failed > 0 && `${outcome.failed} failed`}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !hasChanges}
          className={`px-6 py-2 rounded font-medium ${
            saving || !hasChanges
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {saving ? "Saving..." : "Save All Results"}
        </button>
      </div>
      <ScrollToTopButton />
    </div>
  );
}

function KnockoutAssignSection({
  matches,
  teams,
  groupSlug,
  nextUpcomingMatchId,
}: {
  matches: AdminMatchData[];
  teams: TeamOption[];
  groupSlug: string;
  nextUpcomingMatchId: string | null;
}) {
  const unassigned = matches.filter(
    (m) => m.stage === "knockout" && (m.homeTeamId == null || m.awayTeamId == null)
  );

  useScrollToUpcoming(nextUpcomingMatchId);

  const initialState: Record<string, AssignEntry> = {};
  for (const match of unassigned) {
    initialState[match.id] = { homeTeamId: "", awayTeamId: "" };
  }

  const [assignments, setAssignments] = useState<Record<string, AssignEntry>>(initialState);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ success: number; failed: number } | null>(null);

  function updateAssignment(matchId: string, field: keyof AssignEntry, value: string) {
    setAssignments((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
    setOutcome(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setOutcome(null);
    let success = 0;
    let failed = 0;

    for (const match of unassigned) {
      const entry = assignments[match.id];
      if (!entry || !entry.homeTeamId || !entry.awayTeamId) continue;

      try {
        const res = await fetch(`/api/${groupSlug}/admin/knockout-assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            homeTeamId: entry.homeTeamId,
            awayTeamId: entry.awayTeamId,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setSaving(false);
    setOutcome({ success, failed });
  }

  const hasChanges = unassigned.some((m) => {
    const entry = assignments[m.id];
    return entry && entry.homeTeamId && entry.awayTeamId;
  });

  if (unassigned.length === 0) {
    return <p className="text-gray-500">All knockout teams have been assigned.</p>;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {unassigned.length} knockout matches need team assignments
      </p>

      <div className="space-y-2">
        {unassigned.map((match) => {
          const entry = assignments[match.id];
          return (
            <div key={match.id} data-match-id={match.id} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 scroll-mt-24">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-gray-400">#{match.matchNumber}</span>
                <span className="text-xs text-gray-400">
                  {match.knockoutRound?.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {match.homeSlotLabel} vs {match.awaySlotLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{match.venue}</span>
                <span className="text-gray-300">|</span>
                <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>
                  {new Date(match.kickoffTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {" \u00b7 "}
                  {new Date(match.kickoffTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={entry.homeTeamId}
                  onChange={(e) => updateAssignment(match.id, "homeTeamId", e.target.value)}
                  className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">Home team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
                <select
                  value={entry.awayTeamId}
                  onChange={(e) => updateAssignment(match.id, "awayTeamId", e.target.value)}
                  className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="">Away team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-4 -mx-4 flex items-center justify-between">
        <div>
          {outcome && (
            <span className={`text-sm ${outcome.failed > 0 ? "text-amber-600" : "text-green-600"}`}>
              {outcome.success > 0 && `${outcome.success} teams assigned`}
              {outcome.success > 0 && outcome.failed > 0 && ", "}
              {outcome.failed > 0 && `${outcome.failed} failed`}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !hasChanges}
          className={`px-6 py-2 rounded font-medium ${
            saving || !hasChanges
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-orange-600 text-white hover:bg-orange-700"
          }`}
        >
          {saving ? "Saving..." : "Assign All Teams"}
        </button>
      </div>
      <ScrollToTopButton />
    </div>
  );
}


function PredictionStatusChip({
  predictedCount,
  totalPlayers,
  deadlineOpen,
  missingPlayerNames,
}: {
  predictedCount: number;
  totalPlayers: number;
  deadlineOpen: boolean;
  missingPlayerNames: string[];
}) {
  const allPredicted = predictedCount >= totalPlayers;

  // Deadline passed: static gray chip (not actionable)
  if (!deadlineOpen) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
        {allPredicted ? "✓ " : ""}{predictedCount}/{totalPlayers}
      </span>
    );
  }

  // Deadline open + all predicted: green chip
  if (allPredicted) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-medium whitespace-nowrap">
        ✓ {predictedCount}/{totalPlayers}
      </span>
    );
  }

  // Deadline open + none predicted: red chip
  if (predictedCount === 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-medium whitespace-nowrap">
        {predictedCount}/{totalPlayers}
      </span>
    );
  }

  // Deadline open + some missing: amber chip
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
      {predictedCount}/{totalPlayers}
    </span>
  );
}
