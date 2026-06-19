"use client";

import { useState } from "react";
import { TeamSelectionSection } from "./team-selection-section";
import { BatchPredictionForm, type MatchData } from "./batch-prediction-form";
import { useScrollToUpcoming } from "@/lib/hooks/use-scroll-to-upcoming";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";

interface Team {
  id: string;
  name: string;
  code: string;
  fifaRanking: number;
  groupLetter: string;
}

interface Props {
  teams: Team[];
  selections: { favoriteTeamId: string | null; minnowTeamId: string | null };
  selectionOpen: boolean;
  groupSlug: string;
  matches: MatchData[];
  predictableCount: number;
  predictedCount: number;
  nextUpcomingMatchId: string | null;
}

export function PredictClient({ teams, selections, selectionOpen, groupSlug, matches, predictableCount, predictedCount, nextUpcomingMatchId }: Props) {
  const [teamSelections, setTeamSelections] = useState(selections);

  useScrollToUpcoming(nextUpcomingMatchId);

  return (
    <>
      <TeamSelectionSection
        teams={teams}
        selections={selections}
        selectionOpen={selectionOpen}
        groupSlug={groupSlug}
        onSelectionsChange={setTeamSelections}
      />
      <BatchPredictionForm
        matches={matches}
        groupSlug={groupSlug}
        teamSelections={teamSelections}
        initialTeamSelections={selections}
        selectionOpen={selectionOpen}
        predictableCount={predictableCount}
        predictedCount={predictedCount}
      />
      <ScrollToTopButton />
    </>
  );
}
