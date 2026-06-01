import { PrismaClient } from "@prisma/client";
import fixtureData from "../data/world-cup-2026-fixtures.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.matchScore.deleteMany();
  await prisma.knockoutPrediction.deleteMany();
  await prisma.groupPrediction.deleteMany();
  await prisma.session.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.group.deleteMany();
  await prisma.team.deleteMany();

  // Seed teams
  console.log("Seeding teams...");
  const teamMap: Record<string, string> = {};
  for (const team of fixtureData.teams) {
    const created = await prisma.team.create({
      data: {
        name: team.name,
        code: team.code,
        groupLetter: team.group,
        confederation: team.confederation,
        fifaRanking: team.fifaRanking,
      },
    });
    teamMap[team.code] = created.id;
  }
  console.log(`  Created ${Object.keys(teamMap).length} teams`);

  // Seed group stage matches
  console.log("Seeding group stage matches...");
  for (const match of fixtureData.groupStageMatches) {
    const kickoffTime = parseKickoffTime(match.date, match.time_et);
    await prisma.match.create({
      data: {
        matchNumber: match.matchNumber,
        homeTeamId: teamMap[match.homeTeam],
        awayTeamId: teamMap[match.awayTeam],
        groupLetter: match.group,
        stage: "group",
        venue: match.venue,
        kickoffTime,
        status: "upcoming",
      },
    });
  }
  console.log(`  Created ${fixtureData.groupStageMatches.length} group stage matches`);

  // Seed knockout matches
  console.log("Seeding knockout matches...");
  const knockoutRounds = fixtureData.knockoutRounds;
  let knockoutCount = 0;

  for (const match of knockoutRounds.roundOf32) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  for (const match of knockoutRounds.roundOf16) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  for (const match of knockoutRounds.quarterFinals) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  for (const match of knockoutRounds.semiFinals) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  for (const match of knockoutRounds.thirdPlace) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  for (const match of knockoutRounds.final) {
    await createKnockoutMatch(match);
    knockoutCount++;
  }
  console.log(`  Created ${knockoutCount} knockout matches`);

  console.log("Seeding complete!");
}

interface KnockoutMatchData {
  matchNumber: number;
  date: string;
  time_et: string;
  homeSlotLabel: string;
  awaySlotLabel: string;
  venue: string;
  knockoutRound: string;
}

async function createKnockoutMatch(match: KnockoutMatchData) {
  const kickoffTime = parseKickoffTime(match.date, match.time_et);
  await prisma.match.create({
    data: {
      matchNumber: match.matchNumber,
      homeTeamId: null,
      awayTeamId: null,
      groupLetter: null,
      stage: "knockout",
      knockoutRound: match.knockoutRound,
      venue: match.venue,
      kickoffTime,
      status: "upcoming",
      homeSlotLabel: match.homeSlotLabel,
      awaySlotLabel: match.awaySlotLabel,
    },
  });
}

function parseKickoffTime(date: string, timeEt: string): Date {
  // Parse ET time and convert to UTC
  // ET is UTC-4 during summer (EDT) which is when the World Cup takes place (June-July)
  const [hours, minutes] = timeEt.split(":").map(Number);
  // Create a date in ET, then add 4 hours for UTC
  const etDate = new Date(`${date}T${timeEt}:00`);
  // Add 4 hours (EDT offset)
  etDate.setHours(etDate.getHours() + 4);
  return etDate;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
