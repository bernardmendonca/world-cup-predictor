import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { isPredictionOpen } from "@/lib/utils/time";
import { getCurrentPlayer } from "@/lib/auth/get-session";
import { submitGroupPrediction } from "@/lib/predictions/group-predictions";
import { submitKnockoutPrediction } from "@/lib/predictions/knockout-predictions";
import { applyTimeOverride } from "@/lib/utils/apply-time-override";

export default async function PredictPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; matchId: string }>;
  searchParams: Promise<{ time?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await applyTimeOverride(resolvedSearchParams.time);

  const player = await getCurrentPlayer(resolvedParams.groupSlug);
  if (!player) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please log in to make predictions.</p>
      </div>
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: resolvedParams.matchId },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!match) notFound();

  const open = isPredictionOpen(match.kickoffTime);

  // Get existing prediction
  let existingPrediction: {
    homeScore: number;
    awayScore: number;
    penaltyWinner?: string | null;
  } | null = null;

  if (match.stage === "group") {
    const gp = await prisma.groupPrediction.findUnique({
      where: { playerId_matchId: { playerId: player.id, matchId: match.id } },
    });
    if (gp) existingPrediction = { homeScore: gp.homeScore, awayScore: gp.awayScore };
  } else {
    const kp = await prisma.knockoutPrediction.findUnique({
      where: { playerId_matchId: { playerId: player.id, matchId: match.id } },
    });
    if (kp)
      existingPrediction = {
        homeScore: kp.homeScore,
        awayScore: kp.awayScore,
        penaltyWinner: kp.penaltyWinner,
      };
  }

  const homeName = match.homeTeam?.name || match.homeSlotLabel || "TBD";
  const awayName = match.awayTeam?.name || match.awaySlotLabel || "TBD";

  return (
    <div className="max-w-md mx-auto">
      <a
        href={`/${resolvedParams.groupSlug}/matches`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to matches
      </a>

      <div className="bg-white rounded border p-6 mt-4">
        <div className="text-center mb-4">
          <div className="text-xs text-gray-400 mb-1">
            Match #{match.matchNumber} · {match.stage}
          </div>
          <div className="text-xl font-bold">
            {homeName} vs {awayName}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {match.kickoffTime.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        </div>

        {!open ? (
          <div className="text-center py-4 text-red-600">
            Predictions are closed for this match.
          </div>
        ) : !match.homeTeamId || !match.awayTeamId ? (
          match.stage === "knockout" && (
            <div className="text-center py-4 text-yellow-600">
              Teams have not been confirmed yet. Check back later.
            </div>
          )
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="groupSlug" value={resolvedParams.groupSlug} />
            <input type="hidden" name="stage" value={match.stage} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {homeName}
                </label>
                <input
                  type="number"
                  name="homeScore"
                  min="0"
                  max="20"
                  defaultValue={existingPrediction?.homeScore ?? ""}
                  required
                  className="w-full px-3 py-2 border rounded text-center text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {awayName}
                </label>
                <input
                  type="number"
                  name="awayScore"
                  min="0"
                  max="20"
                  defaultValue={existingPrediction?.awayScore ?? ""}
                  required
                  className="w-full px-3 py-2 border rounded text-center text-lg"
                />
              </div>
            </div>

            {match.stage === "knockout" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  If scores are level, who wins on penalties?
                </label>
                <select
                  name="penaltyWinner"
                  defaultValue={existingPrediction?.penaltyWinner || ""}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">N/A (not a draw)</option>
                  <option value="home">{homeName}</option>
                  <option value="away">{awayName}</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              {existingPrediction ? "Update Prediction" : "Submit Prediction"}
            </button>
          </form>
        )}

        {existingPrediction && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-center">
            Current prediction: {homeName} {existingPrediction.homeScore} -{" "}
            {existingPrediction.awayScore} {awayName}
            {existingPrediction.penaltyWinner &&
              ` (pen: ${existingPrediction.penaltyWinner})`}
          </div>
        )}
      </div>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";
  const matchId = formData.get("matchId") as string;
  const groupSlug = formData.get("groupSlug") as string;
  const stage = formData.get("stage") as string;
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const penaltyWinner = (formData.get("penaltyWinner") as string) || null;

  const player = await getCurrentPlayer(groupSlug);
  if (!player) return;

  if (stage === "group") {
    await submitGroupPrediction(player.id, matchId, homeScore, awayScore);
  } else {
    await submitKnockoutPrediction(
      player.id,
      matchId,
      homeScore,
      awayScore,
      penaltyWinner as "home" | "away" | null
    );
  }

  redirect(`/${groupSlug}/matches/${matchId}`);
}
