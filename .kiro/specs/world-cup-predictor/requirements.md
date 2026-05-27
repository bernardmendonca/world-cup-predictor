# Requirements Document

## Introduction

A football World Cup predictor game designed for small groups of friends and colleagues (20-50 members). Players predict match outcomes during group stages and team advancement during knockout stages. The game features a scoring system with bonuses for favorite/minnow team selections and an odds multiplier that rewards less popular correct predictions. The system supports two deployment modes: an internal deployment on AWS with SSO authentication, and an external deployment on a free/low-cost platform with email verification.

## Glossary

- **Predictor_System**: The World Cup predictor application responsible for managing predictions, scoring, and leaderboards
- **Player**: A registered user who submits predictions and competes in the game
- **Prediction**: A Player's submitted forecast for a match outcome (group stage) or team advancement (knockout stage)
- **Match**: A scheduled World Cup game between two teams
- **Group_Stage**: The initial phase of the World Cup where teams play in round-robin groups
- **Knockout_Stage**: The elimination phase including Round of 32, Quarter Finals, Semi Finals, Third Place, and Final
- **Favorite_Team**: A team selected by a Player whose matches earn double points
- **Minnow_Team**: A team selected by a Player (typically a lower-ranked or underdog team) whose matches earn double points
- **Odds_Multiplier**: A scoring multiplier calculated from the distribution of predictions among all Players for a given match, rewarding less popular correct predictions
- **Kickoff_Time**: The official scheduled start time of a Match
- **Prediction_Deadline**: The time 2 hours before Kickoff_Time after which predictions can no longer be submitted or modified
- **Team_Selection_Deadline**: The time 2 hours before the Kickoff_Time of the first Match of the tournament, after which Favorite_Team and Minnow_Team selections can no longer be made
- **Correct_Result**: A prediction that correctly identifies the match outcome (win for Team A, win for Team B, or draw)
- **Correct_Exact_Score**: A prediction that correctly identifies the exact final score of a match
- **Internal_Deployment**: The deployment hosted on the company AWS account using HERE SSO for authentication
- **External_Deployment**: The deployment hosted on a free or minimal-cost platform using email verification for authentication

## Requirements

### Requirement 1: Player Registration and Authentication

**User Story:** As a player, I want to register and authenticate securely, so that I can participate in the predictor game.

#### Acceptance Criteria

1. WHERE the Internal_Deployment is configured, THE Predictor_System SHALL authenticate Players via HERE SSO
2. WHERE the External_Deployment is configured, THE Predictor_System SHALL authenticate Players via a single-use verification link sent to the Player's provided email address, valid for 15 minutes
3. THE Predictor_System SHALL support a maximum of 50 registered Players per deployment
4. WHEN a Player successfully authenticates, THE Predictor_System SHALL create a session with a duration of 7 days and redirect the Player to the main dashboard
5. IF a Player attempts to register and the deployment has already reached 50 registered Players, THEN THE Predictor_System SHALL reject the registration and display a message indicating the maximum player limit has been reached
6. IF a Player's authentication attempt fails, THEN THE Predictor_System SHALL display a message indicating the authentication was unsuccessful and allow the Player to retry

### Requirement 2: Group Stage Score Predictions

**User Story:** As a player, I want to submit score predictions for group stage matches, so that I can earn points based on my football knowledge.

#### Acceptance Criteria

1. WHEN a Player navigates to a Group_Stage Match, THE Predictor_System SHALL display a form accepting integer score predictions for both teams with values between 0 and 20 inclusive
2. WHEN a Player submits a score prediction, THE Predictor_System SHALL store the prediction associated with the Player and the Match and display a confirmation message indicating the prediction was saved
3. WHEN a Player submits a prediction for a Match they have already predicted, THE Predictor_System SHALL update the existing prediction with the new values and display a confirmation message indicating the prediction was updated
4. WHILE the current time is before the Prediction_Deadline for a Match, THE Predictor_System SHALL allow Players to submit or modify predictions for that Match
5. WHEN the current time reaches or passes the Prediction_Deadline for a Match, THE Predictor_System SHALL reject any new or modified predictions for that Match
6. IF a Player attempts to submit a prediction after the Prediction_Deadline, THEN THE Predictor_System SHALL display a message indicating that predictions are closed for that Match
7. IF a Player submits a score value that is not an integer or is outside the range of 0 to 20, THEN THE Predictor_System SHALL reject the submission and display a message indicating the valid score range

### Requirement 3: Group Stage Scoring

**User Story:** As a player, I want to earn points for correct predictions, so that I can compete with other players on the leaderboard.

#### Acceptance Criteria

1. WHEN a Group_Stage Match result is recorded, THE Predictor_System SHALL award 1 base point to each Player who predicted the Correct_Result
2. WHEN a Group_Stage Match result is recorded, THE Predictor_System SHALL award 3 base points to each Player who predicted the Correct_Exact_Score
3. WHEN a Player has predicted the Correct_Exact_Score, THE Predictor_System SHALL award both the Correct_Result base point (1) and the Correct_Exact_Score base point (3), for a total of 4 base points
4. WHEN a Group_Stage Match result is recorded, THE Predictor_System SHALL calculate the final points for each Player as: base_points × Odds_Multiplier × team_multiplier, rounded to 2 decimal places
5. IF a Player has selected a Favorite_Team or Minnow_Team that is involved in the Match, THEN THE Predictor_System SHALL apply the team_multiplier as defined in Requirement 11 after applying the Odds_Multiplier
6. IF a Player did not submit a prediction for a Match, THEN THE Predictor_System SHALL award 0 points to that Player for that Match

### Requirement 4: Knockout Stage Predictions

**User Story:** As a player, I want to predict which teams advance through each knockout round from day one of the tournament, so that I can earn points for correctly forecasting the tournament bracket.

#### Acceptance Criteria

1. WHEN the tournament begins, THE Predictor_System SHALL make Knockout_Stage predictions available to all Players from day one, displaying all 42 participating teams in the bracket
2. WHEN a Player navigates to the Knockout_Stage prediction view, THE Predictor_System SHALL display the full bracket for Round of 32, Quarter Finals, Semi Finals, Third Place, Runner Up, and Final Winner, allowing the Player to select teams for each stage
3. WHEN a Player submits Knockout_Stage predictions, THE Predictor_System SHALL store the Player's selected teams for each round of the bracket
4. WHILE the current time is before the Kickoff_Time of the first Match of the tournament, THE Predictor_System SHALL allow Players to submit or modify Knockout_Stage predictions for all rounds
5. WHEN the current time reaches or passes the Kickoff_Time of the first Match of the tournament, THE Predictor_System SHALL lock all Knockout_Stage predictions and reject any new or modified submissions
6. IF a Player attempts to submit or modify a Knockout_Stage prediction after the Kickoff_Time of the first Match of the tournament, THEN THE Predictor_System SHALL display a message indicating that knockout predictions are locked for the remainder of the tournament
7. IF a Player predicted a team to reach a knockout round and that team does not actually qualify for that round, THEN THE Predictor_System SHALL award 0 points to that Player for that prediction
8. WHEN a team advances to the Round of 32 in the actual tournament, THE Predictor_System SHALL award 2 points to each Player who correctly predicted that team to reach the Round of 32, with no Odds_Multiplier applied
9. WHEN a team advances to the Quarter Finals in the actual tournament, THE Predictor_System SHALL award 3 points to each Player who correctly predicted that team to reach the Quarter Finals, with no Odds_Multiplier applied
10. WHEN a team advances to the Semi Finals in the actual tournament, THE Predictor_System SHALL award 4 points to each Player who correctly predicted that team to reach the Semi Finals, with no Odds_Multiplier applied
11. WHEN a team finishes in Third Place in the actual tournament, THE Predictor_System SHALL award 5 points to each Player who correctly predicted that team to finish Third, with no Odds_Multiplier applied
12. WHEN a team finishes as Runner Up in the actual tournament, THE Predictor_System SHALL award 6 points to each Player who correctly predicted that team to be Runner Up, with no Odds_Multiplier applied
13. WHEN a team wins the tournament, THE Predictor_System SHALL award 8 points to each Player who correctly predicted that team to win the tournament, with no Odds_Multiplier applied
14. WHEN a Player earns Knockout_Stage points for a prediction involving their Favorite_Team or Minnow_Team, THE Predictor_System SHALL apply the team_multiplier as defined in Requirement 11

### Requirement 5: Favorite Team Selection

**User Story:** As a player, I want to select a favorite team, so that I earn double points on all matches involving that team throughout the tournament.

#### Acceptance Criteria

1. THE Predictor_System SHALL allow each Player to select exactly one Favorite_Team from the list of participating World Cup teams
2. WHILE the current time is before the Team_Selection_Deadline, THE Predictor_System SHALL allow Players to submit or modify their Favorite_Team selection
3. WHEN the current time reaches or passes the Team_Selection_Deadline, THE Predictor_System SHALL lock all Favorite_Team selections and reject any new or modified submissions for the remainder of the tournament
4. IF a Player attempts to select or change their Favorite_Team after the Team_Selection_Deadline, THEN THE Predictor_System SHALL display a message indicating that the selection window has closed
5. WHEN a Match involves a Player's Favorite_Team, THE Predictor_System SHALL apply a 2x multiplier to the points earned by that Player for that Match
6. THE Predictor_System SHALL apply the Favorite_Team multiplier to both Group_Stage and Knockout_Stage matches

### Requirement 6: Minnow Team Selection

**User Story:** As a player, I want to select a minnow team, so that I earn double points on all matches involving that underdog team throughout the tournament.

#### Acceptance Criteria

1. THE Predictor_System SHALL allow each Player to select exactly one Minnow_Team from the list of participating World Cup teams
2. WHILE the current time is before the Team_Selection_Deadline, THE Predictor_System SHALL allow Players to submit or modify their Minnow_Team selection
3. WHEN the current time reaches or passes the Team_Selection_Deadline, THE Predictor_System SHALL lock all Minnow_Team selections and reject any new or modified submissions for the remainder of the tournament
4. IF a Player attempts to select or change their Minnow_Team after the Team_Selection_Deadline, THEN THE Predictor_System SHALL display a message indicating that the selection window has closed
5. WHEN a Match involves a Player's Minnow_Team, THE Predictor_System SHALL apply a 2x multiplier to the points earned by that Player for that Match
6. THE Predictor_System SHALL apply the Minnow_Team multiplier to both Group_Stage and Knockout_Stage matches
7. THE Predictor_System SHALL allow a Player to select the same team as both Favorite_Team and Minnow_Team, resulting in a 4x multiplier for matches involving that team

### Requirement 7: Odds Multiplier Calculation

**User Story:** As a player, I want an odds multiplier based on prediction distribution, so that correctly predicting less popular outcomes is rewarded more than predicting popular outcomes.

#### Acceptance Criteria

1. WHEN the Prediction_Deadline for a Group_Stage Match is reached, THE Predictor_System SHALL calculate the Odds_Multiplier for each possible outcome (Team A win, Team B win, Draw)
2. THE Predictor_System SHALL calculate the Odds_Multiplier for an outcome as: 2 - (number of predictions for that outcome / total number of predictions for the Match), rounded to 2 decimal places
3. THE Predictor_System SHALL ensure the Odds_Multiplier always falls within the range of 1.00 to 2.00 inclusive
4. WHILE the current time is before the Prediction_Deadline for a Match, THE Predictor_System SHALL hide the Odds_Multiplier values from all Players
5. WHEN the Prediction_Deadline for a Match is reached, THE Predictor_System SHALL display the Odds_Multiplier values to all Players
6. IF no Player has predicted a particular outcome, THEN THE Predictor_System SHALL assign an Odds_Multiplier of 0 for that outcome (no one predicted it, so no one can earn points from it)
7. IF only one Player has submitted a prediction for a Match, THEN THE Predictor_System SHALL assign an Odds_Multiplier of 1.00 for the predicted outcome
8. THE Predictor_System SHALL apply the Odds_Multiplier only to Group_Stage matches; Knockout_Stage matches SHALL have an implicit Odds_Multiplier of 1.00

#### Odds Multiplier Examples

**Example 1: Team A vs Team B (4 total predictions)**
| Outcome | Predictions | Multiplier Calculation | Multiplier |
|---------|-------------|----------------------|------------|
| Team A wins | 2 | 2 - (2/4) = 2 - 0.50 | 1.50 |
| Team B wins | 1 | 2 - (1/4) = 2 - 0.25 | 1.75 |
| Draw | 1 | 2 - (1/4) = 2 - 0.25 | 1.75 |

A Player who correctly predicted Team B wins earns: 1 (base) × 1.75 (odds) = 1.75 points for correct result.

**Example 2: Team C vs Team D (10 total predictions)**
| Outcome | Predictions | Multiplier Calculation | Multiplier |
|---------|-------------|----------------------|------------|
| Team C wins | 7 | 2 - (7/10) = 2 - 0.70 | 1.30 |
| Team D wins | 2 | 2 - (2/10) = 2 - 0.20 | 1.80 |
| Draw | 1 | 2 - (1/10) = 2 - 0.10 | 1.90 |

A Player who correctly predicted a Draw earns: 1 (base) × 1.90 (odds) = 1.90 points for correct result.

**Example 3: Team E vs Team F (20 total predictions) — Unanimous prediction**
| Outcome | Predictions | Multiplier Calculation | Multiplier |
|---------|-------------|----------------------|------------|
| Team E wins | 20 | 2 - (20/20) = 2 - 1.00 | 1.00 |
| Team F wins | 0 | N/A | 0.00 |
| Draw | 0 | N/A | 0.00 |

All 20 Players predicted Team E wins. The multiplier is 1.00 (minimum). No one predicted Team F or Draw, so those multipliers are 0.00.

**Example 4: Team G vs Team H (5 total predictions) — Even split**
| Outcome | Predictions | Multiplier Calculation | Multiplier |
|---------|-------------|----------------------|------------|
| Team G wins | 2 | 2 - (2/5) = 2 - 0.40 | 1.60 |
| Team H wins | 2 | 2 - (2/5) = 2 - 0.40 | 1.60 |
| Draw | 1 | 2 - (1/5) = 2 - 0.20 | 1.80 |

The lone Draw predictor gets the highest multiplier (1.80) if correct.

**Example 5: Single prediction submitted**
| Outcome | Predictions | Multiplier Calculation | Multiplier |
|---------|-------------|----------------------|------------|
| Team I wins | 1 | 2 - (1/1) = 2 - 1.00 | 1.00 |
| Team J wins | 0 | N/A | 0.00 |
| Draw | 0 | N/A | 0.00 |

Only one Player submitted a prediction. Their multiplier is 1.00 (no bonus for being contrarian when there is no crowd).

### Requirement 8: Leaderboard

**User Story:** As a player, I want to see a leaderboard showing all players' total points, so that I can track my ranking and compete with others.

#### Acceptance Criteria

1. THE Predictor_System SHALL display a leaderboard showing all Players ranked by total accumulated points in descending order
2. WHEN a Match result is recorded and scores are calculated, THE Predictor_System SHALL update the leaderboard within 5 minutes
3. THE Predictor_System SHALL display each Player's total points, rank position, and number of predictions where the Player earned points (including both Correct_Result and Correct_Exact_Score predictions) on the leaderboard
4. WHEN two or more Players have the same total points, THE Predictor_System SHALL rank them first by the number of Correct_Exact_Score predictions (descending), then by alphabetical order of Player name as a secondary tiebreaker

### Requirement 9: Match Schedule and Results

**User Story:** As a player, I want to see the match schedule and results, so that I know which matches are upcoming and what the outcomes were.

#### Acceptance Criteria

1. THE Predictor_System SHALL display the full World Cup match schedule including team names, dates, times (shown in US Eastern, UK GMT/BST, and India IST time zones), and venues
2. WHEN a Match result is available, THE Predictor_System SHALL display the final score alongside the match details
3. THE Predictor_System SHALL display the Prediction_Deadline for each upcoming Match where the current time is before the Prediction_Deadline
4. WHEN a Match is complete, THE Predictor_System SHALL display a summary showing each Player's predicted score, the actual result, and the points awarded for that Match
5. THE Predictor_System SHALL categorize each Match with a status of Upcoming, In Progress, or Completed

### Requirement 10: Deployment Configuration

**User Story:** As an administrator, I want to deploy the system in two configurations, so that it can serve both internal company users and external friends.

#### Acceptance Criteria

1. THE Predictor_System SHALL support deployment as a web application accessible via the latest two major versions of Chrome, Firefox, Safari, and Edge on desktop and mobile
2. WHERE the Internal_Deployment is configured, THE Predictor_System SHALL be deployable to the company AWS account
3. WHERE the External_Deployment is configured, THE Predictor_System SHALL be deployable to a hosting platform costing no more than $10 USD per month
4. THE Predictor_System SHALL respond to page load and prediction submission requests within 2 seconds under a load of 50 concurrent users
5. THE Predictor_System SHALL store all prediction and scoring data persistently across server restarts
6. THE Predictor_System SHALL use a single codebase with environment-based configuration to switch between Internal_Deployment and External_Deployment
7. THE Predictor_System SHALL be runnable locally on a developer's machine with a single setup command for testing and development purposes, without requiring external cloud services or paid infrastructure

### Requirement 11: Points Stacking for Favorite and Minnow Teams

**User Story:** As a player, I want clarity on how Favorite_Team and Minnow_Team multipliers stack with the Odds_Multiplier, so that I understand my total points for each match.

#### Acceptance Criteria

1. WHEN a Player earns points for a Match, THE Predictor_System SHALL calculate the final score as: base_points × Odds_Multiplier × team_multiplier, rounded to 2 decimal places
2. WHEN a Match involves a Player's Favorite_Team but not their Minnow_Team, THE Predictor_System SHALL apply a team_multiplier of 2
3. WHEN a Match involves a Player's Minnow_Team but not their Favorite_Team, THE Predictor_System SHALL apply a team_multiplier of 2
4. WHEN a Match involves both a Player's Favorite_Team and Minnow_Team as the same team (Player selected the same team for both), THE Predictor_System SHALL apply a team_multiplier of 4
5. WHEN a Match involves a Player's Favorite_Team and Minnow_Team as two different teams (one on each side of the Match), THE Predictor_System SHALL apply a team_multiplier of 4
6. WHEN a Match does not involve a Player's Favorite_Team or Minnow_Team, THE Predictor_System SHALL apply a team_multiplier of 1
