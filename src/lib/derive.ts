import { kickoffSortKey } from "./format";
import { placedSide } from "./knockout";
import type {
  AppState,
  LeaderRow,
  Match,
  Metric,
  StandingRow,
  Tournament,
} from "./types";

export function teamById(state: AppState, id: string | null) {
  if (!id) return null;
  return state.teams.find((team) => team.id === id) ?? null;
}

export function playerById(state: AppState, id: string | null) {
  if (!id) return null;
  return state.players.find((player) => player.id === id) ?? null;
}

export function tournamentBySlug(state: AppState, slug: string) {
  return state.tournaments.find((tournament) => tournament.slug === slug) ?? null;
}

export function tournamentById(state: AppState, id: string) {
  return state.tournaments.find((tournament) => tournament.id === id) ?? null;
}

export function winnerId(match: Match) {
  if (match.status !== "finished" || !match.homeTeamId || !match.awayTeamId) {
    return null;
  }
  if (match.homeScore === match.awayScore) return null;
  return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
}

export function sideTeam(
  state: AppState,
  match: Match,
  side: "home" | "away",
) {
  const placed = placedSide(state, match, side);
  if (placed?.id) return placed;
  const direct = side === "home" ? match.homeTeamId : match.awayTeamId;
  if (direct) {
    return { id: direct, name: teamById(state, direct)?.name ?? "TBD" };
  }
  if (placed) return placed;
  const fromId = side === "home" ? match.homeFromMatchId : match.awayFromMatchId;
  const label = side === "home" ? match.homeLabel : match.awayLabel;
  if (!fromId) return { id: null, name: label || "TBD" };
  const source = state.matches.find((item) => item.id === fromId);
  if (!source) return { id: null, name: "TBD" };
  const winner = winnerId(source);
  if (!winner) return { id: null, name: "Winner advances" };
  return { id: winner, name: teamById(state, winner)?.name ?? "Winner advances" };
}

export function playersForTeam(state: AppState, teamId: string) {
  return state.players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => a.number - b.number);
}

export function matchLabel(state: AppState, match: Match) {
  if (match.stage === "group") {
    const tournament = tournamentById(state, match.tournamentId);
    const group = tournament?.groups.find((item) => item.id === match.groupId);
    return group?.name ?? "Group";
  }
  if (match.round === "quarter-final") return "Quarter-final";
  if (match.round === "semi-final") return "Semi-final";
  if (match.round === "final") return "Final";
  return "Knockout";
}

export function tournamentPhase(state: AppState, tournament: Tournament) {
  const matches = state.matches.filter(
    (match) => match.tournamentId === tournament.id,
  );
  if (matches.some((match) => match.status === "live")) return "Live";
  if (matches.length > 0 && matches.every((match) => match.status === "finished")) {
    return "Finished";
  }
  if (matches.some((match) => match.status === "finished")) return "In progress";
  return "Upcoming";
}

export function groupStandings(
  state: AppState,
  tournament: Tournament,
  groupId: string,
): StandingRow[] {
  const group = tournament.groups.find((item) => item.id === groupId);
  if (!group) return [];

  const rows = new Map<string, Omit<StandingRow, "rank" | "qualification">>();
  for (const teamId of group.teamIds) {
    rows.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  const groupMatches = state.matches.filter(
    (match) => match.tournamentId === tournament.id && match.groupId === groupId,
  );

  for (const match of groupMatches) {
    if (match.status === "scheduled" || !match.homeTeamId || !match.awayTeamId) {
      continue;
    }
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;
    addResult(home, match.homeScore, match.awayScore);
    addResult(away, match.awayScore, match.homeScore);
  }

  const complete =
    groupMatches.length > 0 &&
    groupMatches.every((match) => match.status === "finished");

  return [...rows.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      const aName = teamById(state, a.teamId)?.name ?? "";
      const bName = teamById(state, b.teamId)?.name ?? "";
      return aName.localeCompare(bName);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      qualification:
        index < tournament.qualifyPerGroup
          ? complete
            ? "Qualified"
            : "In the spots"
          : null,
    }));
}

function addResult(
  row: Omit<StandingRow, "rank" | "qualification">,
  scored: number,
  conceded: number,
) {
  row.played += 1;
  row.gf += scored;
  row.ga += conceded;
  row.gd = row.gf - row.ga;
  if (scored > conceded) {
    row.won += 1;
    row.points += 3;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

export function leaderboard(
  state: AppState,
  tournamentId: string,
  metric: Metric,
): LeaderRow[] {
  const tournament = tournamentById(state, tournamentId);
  if (!tournament) return [];
  const matchIds = new Set(
    state.matches
      .filter((match) => match.tournamentId === tournamentId)
      .map((match) => match.id),
  );
  const events = state.events.filter((event) => matchIds.has(event.matchId));
  const players = state.players.filter((player) =>
    tournament.teamIds.includes(player.teamId),
  );

  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  const saves = new Map<string, number>();
  const yellows = new Map<string, number>();
  const reds = new Map<string, number>();
  const cleanSheets = new Map<string, number>();

  for (const event of events) {
    if (event.kind === "goal") {
      bump(goals, event.playerId);
      if (event.relatedPlayerId) bump(assists, event.relatedPlayerId);
    } else if (event.kind === "assist") {
      bump(assists, event.playerId);
    } else if (event.kind === "save") {
      bump(saves, event.playerId);
    } else if (event.kind === "card") {
      if (event.cardColor === "red") bump(reds, event.playerId);
      else bump(yellows, event.playerId);
    }
  }

  for (const match of state.matches) {
    if (match.tournamentId !== tournamentId || match.status !== "finished") continue;
    if (match.awayScore === 0 && match.homeTeamId) {
      for (const player of players) {
        if (player.teamId === match.homeTeamId && player.position === "Goalkeeper") {
          bump(cleanSheets, player.id);
        }
      }
    }
    if (match.homeScore === 0 && match.awayTeamId) {
      for (const player of players) {
        if (player.teamId === match.awayTeamId && player.position === "Goalkeeper") {
          bump(cleanSheets, player.id);
        }
      }
    }
  }

  const rows = players.map((player) => {
    const goalCount = goals.get(player.id) ?? 0;
    const assistCount = assists.get(player.id) ?? 0;
    const saveCount = saves.get(player.id) ?? 0;
    const cleanCount = cleanSheets.get(player.id) ?? 0;
    const yellowCount = yellows.get(player.id) ?? 0;
    const redCount = reds.get(player.id) ?? 0;
    const cardCount = yellowCount + redCount;
    const rating = Math.max(
      0,
      Math.min(
        10,
        Math.round(
          (6 +
            goalCount * 0.7 +
            assistCount * 0.45 +
            saveCount * 0.12 +
            cleanCount * 0.35 -
            yellowCount * 0.25 -
            redCount * 0.8) *
            10,
        ) / 10,
      ),
    );
    const performance =
      goalCount * 4 +
      assistCount * 3 +
      saveCount +
      cleanCount * 2 -
      yellowCount -
      redCount * 2;
    const value =
      metric === "goals"
        ? goalCount
        : metric === "assists"
          ? assistCount
          : metric === "saves"
            ? saveCount
            : metric === "cleanSheets"
              ? cleanCount
              : metric === "cards"
                ? cardCount
                : metric === "rating"
                  ? rating
                  : performance;
    const active =
      goalCount + assistCount + saveCount + cleanCount + cardCount > 0;
    return {
      playerId: player.id,
      name: player.name,
      teamName: teamById(state, player.teamId)?.name ?? "",
      value,
      detail: player.position ?? "",
      active,
    };
  });

  return rows
    .filter((row) => row.active)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      teamName: row.teamName,
      value: row.value,
      detail: row.detail,
    }));
}

function bump(map: Map<string, number>, id: string) {
  map.set(id, (map.get(id) ?? 0) + 1);
}

export function sortedMatches(matches: Match[]) {
  return [...matches].sort(
    (a, b) => kickoffSortKey(a.dayOffset, a.time) - kickoffSortKey(b.dayOffset, b.time),
  );
}

export function progressFor(state: AppState, tournamentId: string) {
  const matches = state.matches.filter((match) => match.tournamentId === tournamentId);
  const done = matches.filter((match) => match.status === "finished").length;
  const pct = matches.length ? Math.round((done / matches.length) * 100) : 0;
  return { done, total: matches.length, pct };
}
