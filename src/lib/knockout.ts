import { kickoffSortKey } from "./format";
import type { AppState, Group, Match, RoundId, Tournament } from "./types";

export const ROUND_SIZE: Record<RoundId, number> = {
  "quarter-final": 4,
  "semi-final": 2,
  final: 1,
};

export type Slot = {
  groupId: string;
  rank: number;
  label: string;
};

type Placed = { id: string | null; name: string };

export function seededRoundId(tournament: {
  groups: { id: string }[];
  qualifyPerGroup: number;
  knockoutRounds: RoundId[];
}): RoundId | null {
  const rounds = tournament.knockoutRounds;
  if (rounds.length === 0 || tournament.groups.length === 0) return null;
  const count = tournament.groups.length * tournament.qualifyPerGroup;
  return rounds.find((round) => ROUND_SIZE[round] * 2 === count) ?? rounds[0];
}

export function knockoutPairs(groups: Group[], qualifyPerGroup: number, round: RoundId): { home: Slot; away: Slot }[] {
  const ordered = [...groups].sort((left, right) => left.name.localeCompare(right.name));
  const qualify = Math.max(1, qualifyPerGroup);
  const matchCount = ROUND_SIZE[round];
  const pairs: { home: Slot; away: Slot }[] = [];

  if (ordered.length === 1) {
    const group = ordered[0];
    const size = Math.min(qualify, group.teamIds.length);
    let low = 1;
    let high = size;
    while (low < high && pairs.length < matchCount) {
      pairs.push({ home: slot(group, low), away: slot(group, high) });
      low += 1;
      high -= 1;
    }
    return pairs;
  }

  if (qualify === 1) {
    for (let index = 0; index + 1 < ordered.length && pairs.length < matchCount; index += 2) {
      pairs.push({ home: slot(ordered[index], 1), away: slot(ordered[index + 1], 1) });
    }
    return pairs;
  }

  for (let index = 0; index < ordered.length && pairs.length < matchCount; index += 2) {
    const left = ordered[index];
    const right = ordered[index + 1];
    if (!right) break;
    for (let rank = 1; rank <= qualify && pairs.length < matchCount; rank += 2) {
      const other = rank + 1;
      if (other > qualify) break;
      pairs.push({ home: slot(left, rank), away: slot(right, other) });
      if (pairs.length < matchCount) {
        pairs.push({ home: slot(right, rank), away: slot(left, other) });
      }
    }
  }

  return pairs;
}

export function placedSide(state: AppState, match: Match, side: "home" | "away"): Placed | null {
  const tournament = state.tournaments.find((item) => item.id === match.tournamentId);
  if (!tournament || match.stage !== "knockout") return null;
  const round = seededRoundId(tournament);
  if (!round || match.round !== round) return null;
  const pairs = knockoutPairs(tournament.groups, tournament.qualifyPerGroup, round);
  const index = seededMatches(state, tournament, round).findIndex((item) => item.id === match.id);
  const pair = pairs[index];
  if (!pair) return null;
  const source = side === "home" ? pair.home : pair.away;
  const teamId = qualifierId(state, tournament, source);
  if (!teamId) return { id: null, name: source.label };
  return { id: teamId, name: state.teams.find((team) => team.id === teamId)?.name ?? source.label };
}

export type KnockoutUpdate = {
  matchId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel: string;
  awayLabel: string;
  clearSource: boolean;
};

export function knockoutUpdates(state: AppState): KnockoutUpdate[] {
  const updates: KnockoutUpdate[] = [];

  for (const tournament of state.tournaments) {
    const round = seededRoundId(tournament);
    if (round) {
      const pairs = knockoutPairs(tournament.groups, tournament.qualifyPerGroup, round);
      seededMatches(state, tournament, round).forEach((match, index) => {
        const pair = pairs[index];
        if (!pair || match.status !== "scheduled") return;
        const homeTeamId = qualifierId(state, tournament, pair.home);
        const awayTeamId = qualifierId(state, tournament, pair.away);
        const clearSource = Boolean(match.homeFromMatchId || match.awayFromMatchId);
        const homeChanges = Boolean(homeTeamId && homeTeamId !== match.homeTeamId);
        const awayChanges = Boolean(awayTeamId && awayTeamId !== match.awayTeamId);
        const labelChanges = match.homeLabel !== pair.home.label || match.awayLabel !== pair.away.label;
        if (!homeChanges && !awayChanges && !labelChanges && !clearSource) return;
        updates.push({
          matchId: match.id,
          homeTeamId: homeChanges ? homeTeamId ?? undefined : undefined,
          awayTeamId: awayChanges ? awayTeamId ?? undefined : undefined,
          homeLabel: pair.home.label,
          awayLabel: pair.away.label,
          clearSource,
        });
      });
    }

    for (const match of state.matches) {
      if (match.tournamentId !== tournament.id || match.stage !== "knockout" || match.status !== "scheduled") continue;
      if (match.round === round) continue;
      const homeTeamId = match.homeFromMatchId ? winnerId(state, match.homeFromMatchId) : null;
      const awayTeamId = match.awayFromMatchId ? winnerId(state, match.awayFromMatchId) : null;
      const homeChanges = Boolean(homeTeamId && homeTeamId !== match.homeTeamId);
      const awayChanges = Boolean(awayTeamId && awayTeamId !== match.awayTeamId);
      if (!homeChanges && !awayChanges) continue;
      updates.push({
        matchId: match.id,
        homeTeamId: homeChanges ? homeTeamId ?? undefined : undefined,
        awayTeamId: awayChanges ? awayTeamId ?? undefined : undefined,
        homeLabel: "",
        awayLabel: "",
        clearSource: false,
      });
    }
  }

  return updates;
}

function seededMatches(state: AppState, tournament: Tournament, round: RoundId) {
  return state.matches
    .filter((match) => match.tournamentId === tournament.id && match.round === round)
    .sort(
      (left, right) =>
        kickoffSortKey(left.dayOffset, left.time) - kickoffSortKey(right.dayOffset, right.time) ||
        left.id.localeCompare(right.id),
    );
}

function qualifierId(state: AppState, tournament: Tournament, source: Slot) {
  const ranked = groupRanking(state, tournament, source.groupId);
  return ranked?.[source.rank - 1] ?? null;
}

function groupRanking(state: AppState, tournament: Tournament, groupId: string) {
  const group = tournament.groups.find((item) => item.id === groupId);
  if (!group) return null;
  const matches = state.matches.filter(
    (match) => match.tournamentId === tournament.id && match.groupId === groupId,
  );
  if (
    matches.length === 0 ||
    matches.some((match) => match.status !== "finished" || !match.homeTeamId || !match.awayTeamId)
  ) {
    return null;
  }

  const rows = new Map<string, { id: string; points: number; gd: number; gf: number }>();
  for (const teamId of group.teamIds) rows.set(teamId, { id: teamId, points: 0, gd: 0, gf: 0 });
  for (const match of matches) {
    const home = rows.get(match.homeTeamId ?? "");
    const away = rows.get(match.awayTeamId ?? "");
    if (!home || !away) continue;
    home.gf += match.homeScore;
    home.gd += match.homeScore - match.awayScore;
    away.gf += match.awayScore;
    away.gd += match.awayScore - match.homeScore;
    if (match.homeScore > match.awayScore) home.points += 3;
    else if (match.homeScore < match.awayScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...rows.values()]
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      if (right.gd !== left.gd) return right.gd - left.gd;
      if (right.gf !== left.gf) return right.gf - left.gf;
      const leftName = state.teams.find((team) => team.id === left.id)?.name ?? "";
      const rightName = state.teams.find((team) => team.id === right.id)?.name ?? "";
      return leftName.localeCompare(rightName);
    })
    .map((row) => row.id);
}

function winnerId(state: AppState, matchId: string) {
  const match = state.matches.find((item) => item.id === matchId);
  if (!match || match.status !== "finished" || !match.homeTeamId || !match.awayTeamId) return null;
  if (match.homeScore === match.awayScore) return match.penaltyWinnerId ?? null;
  return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
}

function slot(group: Group, rank: number): Slot {
  return { groupId: group.id, rank, label: `${group.name} #${rank}` };
}
