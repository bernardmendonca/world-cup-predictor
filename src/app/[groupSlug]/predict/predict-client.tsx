"use client";

import { useState } from "react";
import { TeamSelectionSection } from "./team-selection-section";
import { BatchPredictionForm, type MatchData } from "./batch-prediction-form";

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
}

export function PredictClient({ teams, selections, selectionOpen, groupSlug, matches }: Props) {
  const [teamSelections, setTeamSelections] = useState(selections);

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
      />
    </>
  );
}
