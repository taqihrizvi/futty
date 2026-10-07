import { dayOffsetFromDate, kickoffSortKey } from "./format";
import { slugify, uid } from "./ids";
import type { AppState, Match, NewTournamentInput, RoundId } from "./types";

const ROUND_SIZE: Record<RoundId, number> = {
  "quarter-final": 4,
  "semi-final": 2,
  final: 1,
};

const ROUND_ORDER: RoundId[] = ["quarter-final", "semi-final", "final"];

export function pairings(teamIds: string[]) {
  const teams = [...teamIds];
  if (teams.length < 2) return [] as [string, string][];
  if (teams.length % 2 === 1) teams.push("__bye__");
  const count = teams.length;
  const half = count / 2;
  const list = [...teams];
  const pairs: [string, string][] = [];

  for (let round = 0; round < count - 1; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const left = list[index];
      const right = list[count - 1 - index];
      if (left === "__bye__" || right === "__bye__") continue;
      pairs.push(round % 2 === 0 ? [left, right] : [right, left]);
    }
    const fixed = list[0];
    const rest = list.slice(1);
    const moved = rest.pop();
    if (moved) rest.unshift(moved);
    list.splice(0, list.length, fixed, ...rest);
  }

  return pairs;
}

export function publishTournament(state: AppState, input: NewTournamentInput) {
  const tournamentId = uid("tour");
  let slug = slugify(input.name);
  if (state.tournaments.some((tournament) => tournament.slug === slug)) {
    slug = `${slug}-${uid("s").slice(-4)}`;
  }

  const teams = input.teams.map((team) => ({
    id: uid("t"),
    name: team.name.trim(),
    city: team.city.trim() || input.city.trim(),
  }));

  const groupCount = Math.max(1, Math.min(input.groupCount, teams.length));
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    id: uid("g"),
    name: `Group ${String.fromCharCode(65 + index)}`,
    teamIds: [] as string[],
  }));
  teams.forEach((team, index) => {
    groups[index % groupCount].teamIds.push(team.id);
  });

  const baseOffset = dayOffsetFromDate(input.startDate);
  const matches: Match[] = [];
  let slot = 0;

  for (const group of groups) {
    for (const [home, away] of pairings(group.teamIds)) {
      const kick = slotTime(baseOffset, slot);
      slot += 1;
      matches.push({
        id: uid("m"),
        tournamentId,
        stage: "group",
        groupId: group.id,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: 0,
        awayScore: 0,
        status: "scheduled",
        dayOffset: kick.dayOffset,
        time: kick.time,
        venue: input.venue.trim() || "Main pitch",
        clockSeconds: 0,
        clockRunning: false,
        clockAnchor: null,
        period: 1,
        onBreak: false,
      });
    }
  }

  const rounds = ROUND_ORDER.filter((round) => input.rounds.includes(round));
  const roundMatchIds = new Map<RoundId, string[]>();

  for (const round of rounds) {
    const ids: string[] = [];
    for (let index = 0; index < ROUND_SIZE[round]; index += 1) {
      const id = uid("m");
      ids.push(id);
      const kick = slotTime(baseOffset + 2, index);
      const previous = previousRound(round, rounds);
      const homeFrom = previous ? roundMatchIds.get(previous)?.[index * 2] : undefined;
      const awayFrom = previous
        ? roundMatchIds.get(previous)?.[index * 2 + 1]
        : undefined;
      matches.push({
        id,
        tournamentId,
        stage: "knockout",
        round,
        homeTeamId: null,
        awayTeamId: null,
        homeFromMatchId: homeFrom,
        awayFromMatchId: awayFrom,
        homeScore: 0,
        awayScore: 0,
        status: "scheduled",
        dayOffset: kick.dayOffset,
        time: kick.time,
        venue: input.venue.trim() || "Main pitch",
        clockSeconds: 0,
        clockRunning: false,
        clockAnchor: null,
        period: 1,
        onBreak: false,
      });
    }
    roundMatchIds.set(round, ids);
  }

  const next: AppState = {
    ...state,
    teams: [...state.teams, ...teams],
    tournaments: [
      ...state.tournaments,
      {
        id: tournamentId,
        slug,
        name: input.name.trim(),
        city: input.city.trim(),
        venue: input.venue.trim() || "Main pitch",
        format: input.format,
        startLabel: input.startDate,
        endLabel: input.endDate,
        qualifyPerGroup: input.qualifyPerGroup,
        teamIds: teams.map((team) => team.id),
        groups,
        knockoutRounds: rounds,
      },
    ],
    matches: [...state.matches, ...matches].sort(
      (a, b) => kickoffSortKey(a.dayOffset, a.time) - kickoffSortKey(b.dayOffset, b.time),
    ),
  };

  return { state: next, slug };
}

function previousRound(round: RoundId, selected: RoundId[]) {
  const index = selected.indexOf(round);
  if (index <= 0) return null;
  return selected[index - 1];
}

function slotTime(baseOffset: number, slot: number) {
  const startMinutes = 18 * 60 + slot * 40;
  const extraDays = Math.floor(startMinutes / (24 * 60));
  const minutes = startMinutes % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return {
    dayOffset: baseOffset + extraDays,
    time: `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`,
  };
}
