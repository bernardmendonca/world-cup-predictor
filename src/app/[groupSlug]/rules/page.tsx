export default async function RulesPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Scoring Rules</h1>

      {/* Base Points */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Base Points</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Points are awarded based on how close your prediction is to the actual result.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400">Prediction Accuracy</th>
                <th className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Correct exact score</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">3</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Correct result (wrong score)</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">1</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Incorrect result</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Example</p>
          <p className="text-blue-700 dark:text-blue-400">
            Actual result: Brazil 2 – 1 Germany<br />
            You predicted: 2 – 1 → <strong>3 points</strong> (exact score)<br />
            Another player predicted: 1 – 0 → <strong>1 point</strong> (correct winner, wrong score)<br />
            Another player predicted: 0 – 2 → <strong>0 points</strong> (wrong result)
          </p>
        </div>
      </section>

      {/* Odds Multiplier */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Odds Multiplier (1.00 – 2.00)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Less popular correct predictions are rewarded more. The multiplier is calculated from the distribution of predictions in your group.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 text-sm mb-3">
          <p className="font-mono text-center dark:text-gray-200 mb-2">
            odds_multiplier = 2 − (predictions_for_your_outcome ÷ total_predictions)
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-center text-xs">
            Result always between 1.00 and 2.00. Outcomes with 0 predictions get multiplier 0.
          </p>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Example — 10 players predict a match</p>
          <p className="text-blue-700 dark:text-blue-400 mb-2">
            7 predict Team A wins → multiplier = 2 − (7/10) = <strong>1.30</strong><br />
            2 predict Team B wins → multiplier = 2 − (2/10) = <strong>1.80</strong><br />
            1 predicts Draw → multiplier = 2 − (1/10) = <strong>1.90</strong>
          </p>
          <p className="text-blue-700 dark:text-blue-400">
            If the result is a Draw, the lone player who predicted it gets the highest multiplier (1.90), rewarding their contrarian pick.
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Odds multipliers are hidden until the prediction deadline passes (2 hours before kickoff).
        </p>
      </section>

      {/* Team Multiplier */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Team Multiplier (Favorite &amp; Minnow)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Before the tournament starts, you pick a <span className="text-blue-600 dark:text-blue-400 font-medium">Favorite Team</span> and a <span className="text-green-600 dark:text-green-400 font-medium">Minnow Team</span>. You earn a bonus multiplier when you correctly predict an outcome involving your selected team.
        </p>

        <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">When does the 2x multiplier apply?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          The multiplier kicks in when <strong>both</strong> of the following are true:
        </p>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 text-sm mb-3 dark:text-gray-300">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Your team is playing</strong> — the match involves your favorite or minnow team.
            </li>
            <li>
              <strong>You correctly predicted the outcome for that team</strong> — either:
              <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-gray-600 dark:text-gray-400">
                <li>You predicted your team to <strong>win</strong> and they actually won, OR</li>
                <li>You predicted a <strong>draw</strong> and the match actually ended in a draw</li>
              </ul>
            </li>
          </ol>
        </div>

        <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">When does it NOT apply?</h3>
        <div className="bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800 p-3 text-sm mb-3">
          <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-400">
            <li>You predicted your team to win but they lost or drew</li>
            <li>You predicted the other team to win (even if that prediction was correct)</li>
            <li>You predicted a draw but the match had a winner (or vice versa)</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400">Scenario</th>
                <th className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">Multiplier</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Your team not playing, or prediction was wrong</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">1x</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Favorite OR minnow qualifies (correct win or draw prediction)</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">2x</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Same team is both favorite AND minnow, and qualifies</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">4x</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Favorite vs minnow match, predicted draw, actual draw</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">4x</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Examples</p>
          <p className="text-blue-700 dark:text-blue-400">
            Your favorite team is Brazil.<br /><br />
            ✅ Brazil vs Germany — you predicted Brazil 2–1, result is Brazil 2–1 → <strong>2x applies</strong><br />
            ✅ Brazil vs Germany — you predicted 1–1 draw, result is 0–0 → <strong>2x applies</strong> (correct result, team in match)<br />
            ❌ Brazil vs Germany — you predicted Germany 1–0, result is Germany 1–0 → <strong>no bonus</strong> (you predicted against your team)<br />
            ❌ Brazil vs Germany — you predicted Brazil 2–1, result is 0–0 → <strong>no bonus</strong> (your prediction was wrong)
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm mt-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">⭐ Favorite Team</p>
            <p className="text-blue-700 dark:text-blue-400">
              Any of the 48 teams. Pick the team you believe in — earn 2x when you correctly predict their outcomes.
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-800 dark:text-green-300 mb-1">🐟 Minnow Team</p>
            <p className="text-green-700 dark:text-green-400">
              Only the 14 lowest-ranked teams (FIFA rank ≥ 44). Pick an underdog — earn 2x when you correctly predict their outcomes.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Selections must be made before the tournament starts (2 hours before the first match). Once locked, they cannot be changed.
        </p>
      </section>

      {/* Final Score Formula */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Final Score Formula</h2>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="font-mono text-lg dark:text-gray-200 mb-2">
            total = base_points × odds_multiplier × team_multiplier
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Rounded to 2 decimal places</p>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Example</p>
          <p className="text-blue-700 dark:text-blue-400">
            You predict the exact score correctly (3 base points).<br />
            Only 2 out of 10 players predicted this outcome (odds multiplier = 1.80).<br />
            The match involves your favorite team (team multiplier = 2x).<br />
            <strong>Total = 3 × 1.80 × 2 = 10.80 points</strong>
          </p>
        </div>
      </section>

      {/* Knockout Stage Rules */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Knockout Stage Scoring</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          The same scoring formula applies to knockout matches. The key difference is how draws are handled — knockout matches cannot end in a draw, so penalties decide the winner. You are also rewarded for correctly identifying the advancing team, even if you predicted an outright win instead of penalties.
        </p>

        <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">When a knockout match goes to penalties</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          If you predict equal scores, you must select which team wins the penalty shootout. But you can also earn points by predicting the correct advancing team via an outright win.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400">Scenario</th>
                <th className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Exact drawn score + correct penalty winner</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">3</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Any draw predicted + correct penalty winner (wrong exact score)</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">1</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Predicted advancing team to win outright (non-draw)</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">1</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Any draw predicted + wrong penalty winner</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">0</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Predicted the losing team to win outright</td>
                <td className="px-4 py-2 text-right font-bold dark:text-gray-100">0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold mb-2 dark:text-gray-200">When a knockout match is decided in regular/extra time</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          If the match has a clear winner (unequal scores), the scoring works exactly like the group stage — correct result = 1 point, exact score = 3 points.
        </p>

        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Example — Quarter Final decided by penalties</p>
          <p className="text-blue-700 dark:text-blue-400">
            Actual result: Argentina 1 – 1 France (Argentina wins on penalties)<br /><br />
            Player A predicted: 1 – 1, penalty winner: Argentina → <strong>3 points</strong> (exact score + correct penalty winner)<br />
            Player B predicted: 0 – 0, penalty winner: Argentina → <strong>1 point</strong> (correct result — draw with correct penalty winner — but wrong exact score)<br />
            Player C predicted: Argentina 2 – 1 → <strong>1 point</strong> (predicted the correct advancing team via outright win)<br />
            Player D predicted: 1 – 1, penalty winner: France → <strong>0 points</strong> (correct score but wrong penalty winner)<br />
            Player E predicted: France 2 – 1 → <strong>0 points</strong> (predicted the wrong team to advance)
          </p>
        </div>

        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">💡 Why this matters</p>
          <p className="text-amber-700 dark:text-amber-400">
            In knockout football, what matters most is <strong>who goes through</strong>. If you correctly identify the advancing team but predict them winning 2–1 instead of on penalties, you still get 1 point. Team multipliers also apply — if the advancing team is your favorite/minnow and you predicted them to win, you earn the 2x bonus.
          </p>
        </div>
      </section>

      {/* Knockout Match Availability */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">When Can I Predict Knockout Matches?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Knockout matches become available for predictions once both teams are confirmed (after the previous round is complete and the admin assigns teams). You have until 2 hours before kickoff to submit your prediction.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 text-sm dark:text-gray-300">
          <ol className="list-decimal list-inside space-y-1">
            <li>Group stage ends → Admin assigns Round of 32 teams</li>
            <li>R32 matches become predictable → You submit predictions</li>
            <li>R32 results recorded → Admin assigns R16 teams</li>
            <li>R16 matches become predictable → You submit predictions</li>
            <li>...and so on through Quarter Finals, Semi Finals, Third Place, and the Final</li>
          </ol>
        </div>
      </section>

      {/* Deadlines */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">Deadlines</h2>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400">Action</th>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400">Deadline</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Team selection (favorite &amp; minnow)</td>
                <td className="px-4 py-2 dark:text-gray-300">2 hours before the first match of the tournament</td>
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 dark:text-gray-300">Match prediction</td>
                <td className="px-4 py-2 dark:text-gray-300">2 hours before that match kicks off</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Predictions can be changed as many times as you want before the deadline. Once the deadline passes, your prediction is locked.
        </p>
      </section>

      <div className="text-center mb-8">
        <a
          href={`/${groupSlug}/predict`}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          Start Predicting →
        </a>
      </div>
    </div>
  );
}
