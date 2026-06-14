"use client";

import { useState } from "react";

export interface MatchData {
  id: string;
  matchNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  stage: string;
  knockoutRound: string | null;
  groupLetter: string | null;
  venue: string;
  kickoffTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  teamsConfirmed: boolean;
  predictionOpen: boolean;
  existingPrediction: {
    homeScore: number;
    awayScore: number;
    penaltyWinner: string | null;
  } | null;
  participantScores: {
    totalPoints: number;
    basePoints: number;
    oddsMultiplier: number;
    teamMultiplier: number;
  } | null;
}

interface Props {
  matches: MatchData[];
  groupSlug: string;
  teamSelections?: {
    favoriteTeamId: string | null;
    minnowTeamId: string | null;
  };
  initialTeamSelections?: {
    favoriteTeamId: string | null;
    minnowTeamId: string | null;
  };
  selectionOpen?: boolean;
  predictableCount: number;
  predictedCount: number;
}

interface PredictionEntry {
  homeScore: string;
  awayScore: string;
  penaltyWinner: string | null;
}

export function BatchPredictionForm({ matches, groupSlug, teamSelections, initialTeamSelections, selectionOpen, predictableCount, predictedCount }: Props) {
  // Initialize state from existing predictions
  const initialState: Record<string, PredictionEntry> = {};
  for (const match of matches) {
    if (match.existingPrediction) {
      initialState[match.id] = {
        homeScore: String(match.existingPrediction.homeScore),
        awayScore: String(match.existingPrediction.awayScore),
        penaltyWinner: match.existingPrediction.penaltyWinner,
      };
    } else {
      initialState[match.id] = { homeScore: "", awayScore: "", penaltyWinner: null };
    }
  }

  const [predictions, setPredictions] = useState<Record<string, PredictionEntry>>(initialState);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; teamsSaved?: boolean } | null>(null);
  const [savedCount, setSavedCount] = useState(predictedCount);

  // Use teamSelections prop directly (updated by parent via state)
  const currentTeamSelections = teamSelections || { favoriteTeamId: null, minnowTeamId: null };

  function updatePrediction(matchId: string, field: keyof PredictionEntry, value: string | null) {
    setPredictions((prev) => {
      const entry = { ...prev[matchId], [field]: value };
      // Auto-clear penalty winner if scores are unequal
      if (field === "homeScore" || field === "awayScore") {
        const h = field === "homeScore" ? value : entry.homeScore;
        const a = field === "awayScore" ? value : entry.awayScore;
        if (h !== "" && a !== "" && h !== a) {
          entry.penaltyWinner = null;
        }
      }
      return { ...prev, [matchId]: entry };
    });
    setResult(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setResult(null);

    let success = 0;
    let failed = 0;
    let teamsSaved = false;

    // Save team selections if changed
    if (selectionOpen && currentTeamSelections) {
      const initial = initialTeamSelections || { favoriteTeamId: null, minnowTeamId: null };
      const favoriteChanged = currentTeamSelections.favoriteTeamId !== initial.favoriteTeamId;
      const minnowChanged = currentTeamSelections.minnowTeamId !== initial.minnowTeamId;

      if (favoriteChanged || minnowChanged) {
        try {
          const body: Record<string, string> = {};
          if (favoriteChanged && currentTeamSelections.favoriteTeamId) {
            body.favoriteTeamId = currentTeamSelections.favoriteTeamId;
          }
          if (minnowChanged && currentTeamSelections.minnowTeamId) {
            body.minnowTeamId = currentTeamSelections.minnowTeamId;
          }

          if (Object.keys(body).length > 0) {
            const res = await fetch(`/api/${groupSlug}/teams/selection`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (res.ok) {
              teamsSaved = true;
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }
      }
    }

    // Save match predictions
    for (const match of matches) {
      const pred = predictions[match.id];
      if (!pred || pred.homeScore === "" || pred.awayScore === "") continue;
      if (!match.predictionOpen || !match.teamsConfirmed) continue;

      const homeScore = parseInt(pred.homeScore, 10);
      const awayScore = parseInt(pred.awayScore, 10);

      if (isNaN(homeScore) || isNaN(awayScore)) continue;
      if (homeScore < 0 || homeScore > 20 || awayScore < 0 || awayScore > 20) continue;

      // Skip if unchanged from existing prediction
      if (
        match.existingPrediction &&
        match.existingPrediction.homeScore === homeScore &&
        match.existingPrediction.awayScore === awayScore &&
        match.existingPrediction.penaltyWinner === pred.penaltyWinner
      ) {
        continue;
      }

      // For knockout with equal scores, penalty winner is required
      if (match.stage === "knockout" && homeScore === awayScore && !pred.penaltyWinner) {
        failed++;
        continue;
      }

      const endpoint =
        match.stage === "group"
          ? `/api/${groupSlug}/predictions/group`
          : `/api/${groupSlug}/predictions/knockout`;

      const body: Record<string, unknown> = { matchId: match.id, homeScore, awayScore };
      if (match.stage === "knockout") {
        body.penaltyWinner = homeScore === awayScore ? pred.penaltyWinner : null;
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setSaving(false);
    setResult({ success, failed, teamsSaved });
    if (success > 0) {
      setSavedCount((prev) => prev + success);
    }
  }

  const teamSelectionsChanged = selectionOpen && currentTeamSelections && initialTeamSelections && (
    currentTeamSelections.favoriteTeamId !== initialTeamSelections.favoriteTeamId ||
    currentTeamSelections.minnowTeamId !== initialTeamSelections.minnowTeamId
  );

  const hasChanges = teamSelectionsChanged || matches.some((match) => {
    const pred = predictions[match.id];
    if (!pred || pred.homeScore === "" || pred.awayScore === "") return false;
    if (!match.predictionOpen || !match.teamsConfirmed) return false;
    if (!match.existingPrediction) return true;
    return (
      match.existingPrediction.homeScore !== parseInt(pred.homeScore, 10) ||
      match.existingPrediction.awayScore !== parseInt(pred.awayScore, 10) ||
      match.existingPrediction.penaltyWinner !== pred.penaltyWinner
    );
  });

  // Compute stage/round labels for dividers
  function getStageLabel(match: MatchData): string {
    if (match.stage === "group") return "group";
    return match.knockoutRound || "knockout";
  }

  function getStageLabelDisplay(key: string): string {
    switch (key) {
      case "group": return "Group Stage";
      case "round_of_32": return "Round of 32";
      case "round_of_16": return "Round of 16";
      case "quarter_finals": return "Quarter Finals";
      case "semi_finals": return "Semi Finals";
      case "third_place": return "Third Place";
      case "final": return "Final";
      default: return key;
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {savedCount} of {predictableCount} predictions submitted
      </p>
      <div className="space-y-1">
        {matches.map((match, index) => {
          const pred = predictions[match.id];
          const isKnockout = match.stage === "knockout";
          const scoresEqual =
            pred.homeScore !== "" &&
            pred.awayScore !== "" &&
            pred.homeScore === pred.awayScore;
          const canPredict = match.predictionOpen && match.teamsConfirmed;
          const isCompleted = match.status === "completed";
          const hasPrediction = pred.homeScore !== "" && pred.awayScore !== "";
          const missingPrediction = canPredict && !hasPrediction;
          const missingPenalty = canPredict && isKnockout && scoresEqual && !pred.penaltyWinner;

          // Determine if we need a stage divider before this match
          const currentLabel = getStageLabel(match);
          const prevLabel = index > 0 ? getStageLabel(matches[index - 1]) : null;
          const showDivider = index === 0 || currentLabel !== prevLabel;

          return (
            <div key={match.id} data-match-id={match.id} className="scroll-mt-24">
              {showDivider && (
                <div className={`${index > 0 ? "mt-6" : ""} mb-2 flex items-center gap-3`}>
                  <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600"></div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {getStageLabelDisplay(currentLabel)}
                  </span>
                  <div className="h-px flex-1 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              )}
            <div
              className={`p-3 rounded border ${
                missingPrediction || missingPenalty
                  ? "border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950"
                  : isCompleted
                    ? "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                    : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {/* Match info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">#{match.matchNumber}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {match.groupLetter ? `Grp ${match.groupLetter}` : match.knockoutRound?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-sm w-[100px] sm:w-[120px] text-right truncate">
                      {match.homeTeamName}
                    </span>

                    {/* Score inputs */}
                    {canPredict ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={pred.homeScore}
                          onChange={(e) => updatePrediction(match.id, "homeScore", e.target.value)}
                          className="w-10 h-8 text-center border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                          placeholder="-"
                        />
                        <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={pred.awayScore}
                          onChange={(e) => updatePrediction(match.id, "awayScore", e.target.value)}
                          className="w-10 h-8 text-center border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                          placeholder="-"
                        />
                      </div>
                    ) : !match.teamsConfirmed ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500 px-2">
                        TBD
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">🔒</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            disabled
                            value={pred.homeScore}
                            className="w-10 h-8 text-center border rounded text-sm bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            placeholder="-"
                          />
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                          <input
                            type="number"
                            disabled
                            value={pred.awayScore}
                            className="w-10 h-8 text-center border rounded text-sm bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            placeholder="-"
                          />
                        </div>
                      </div>
                    )}

                    <span className="font-medium text-sm w-[100px] sm:w-[120px] truncate">
                      {match.awayTeamName}
                    </span>
                  </div>
                </div>

                {/* Penalty winner (knockout only, equal scores) */}
                {isKnockout && canPredict && scoresEqual && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Pen:</span>
                    <button
                      type="button"
                      onClick={() => updatePrediction(match.id, "penaltyWinner", "home")}
                      className={`px-2 py-1 rounded ${
                        pred.penaltyWinner === "home"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    >
                      {match.homeTeamCode || "H"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePrediction(match.id, "penaltyWinner", "away")}
                      className={`px-2 py-1 rounded ${
                        pred.penaltyWinner === "away"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    >
                      {match.awayTeamCode || "A"}
                    </button>
                  </div>
                )}

                {/* Status indicators */}
                {(missingPrediction || missingPenalty) && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs" title={missingPenalty ? "Penalty winner selection is missing" : "No prediction submitted for this match"}>
                    ℹ️ {missingPenalty ? "Pick pen winner" : "Missing"}
                  </span>
                )}

                {/* Show existing prediction badge */}
                {match.existingPrediction && canPredict && (
                  <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                )}

                {/* Compare button — only for locked matches */}
                {!canPredict && match.teamsConfirmed && (
                  <a
                    href={`/${groupSlug}/matches/${match.id}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-500 hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Compare predictions"
                  >
                    👁 Compare
                  </a>
                )}
              </div>

              {/* Kickoff time */}
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(match.kickoffTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                ET · {match.venue}
              </div>

              {/* Actual result for completed matches */}
              {isCompleted && match.homeScore !== null && match.awayScore !== null && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Result:</span>{" "}
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {match.homeScore} - {match.awayScore}
                  </span>
                </div>
              )}

              {/* Per-match score for the logged-in player (visible once admin records results) */}
              {match.participantScores && (
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Your score:</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Base {match.participantScores.basePoints} ×
                    Odds {match.participantScores.oddsMultiplier.toFixed(2)} ×
                    Team {match.participantScores.teamMultiplier}
                  </span>
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    = {match.participantScores.totalPoints.toFixed(2)} pts
                  </span>
                </div>
              )}
            </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-4 -mx-4 flex items-center justify-between">
        <div>
          {result && (
            <span className={`text-sm ${result.failed > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
              {result.teamsSaved && "Teams saved"}
              {result.teamsSaved && result.success > 0 && ", "}
              {result.success > 0 && `${result.success} predictions saved`}
              {(result.teamsSaved || result.success > 0) && result.failed > 0 && ", "}
              {result.failed > 0 && `${result.failed} failed`}
              {!result.teamsSaved && result.success === 0 && result.failed === 0 && "No changes to save"}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !hasChanges}
          className={`px-6 py-2 rounded font-medium ${
            saving || !hasChanges
              ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saving ? "Saving..." : "Save All Predictions"}
        </button>
      </div>
    </div>
  );
}
