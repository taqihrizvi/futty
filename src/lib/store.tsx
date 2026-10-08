"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Loader } from "@/components/loader";
import { elapsedSeconds, HALF_LIMIT_SECONDS } from "./format";
import { teamKey } from "./publish";
import { uid } from "./ids";
import type { AppState, CardColor, Match, MatchEvent, NewTournamentInput, Player, TournamentDetails } from "./types";

type Snapshot = {
  state: AppState;
  booted: boolean;
  error: string | null;
};

type StoreApi = {
  state: AppState;
  addGoal: (
    matchId: string,
    teamId: string,
    playerId: string,
    assistPlayerId?: string,
  ) => void;
  addAssist: (matchId: string, teamId: string, playerId: string) => void;
  addSave: (matchId: string, teamId: string, playerId: string) => void;
  addCard: (matchId: string, teamId: string, playerId: string, color: CardColor) => void;
  addSub: (matchId: string, teamId: string, playerOffId: string, playerOnId: string) => void;
  undoLast: (matchId: string) => void;
  startMatch: (matchId: string, homePlayerIds: string[], awayPlayerIds: string[]) => void;
  pauseMatch: (matchId: string) => void;
  resumeMatch: (matchId: string) => void;
  endHalf: (matchId: string) => void;
  startSecondHalf: (matchId: string) => void;
  endMatch: (matchId: string, penaltyWinnerId?: string) => void;
  recordPenalties: (matchId: string, teamId: string) => void;
  armClock: (matchId: string) => void;
  setMyTeam: (teamId: string | null) => void;
  addPlayer: (player: Omit<Player, "id">) => void;
  updatePlayer: (id: string, patch: Partial<Omit<Player, "id">>) => void;
  removePlayer: (id: string) => void;
  addTeam: (team: { name: string; city: string }) => void;
  addTeamToTournament: (input: {
    tournamentId: string;
    teamId?: string;
    name?: string;
    city?: string;
    groupId?: string;
  }) => void;
  removeTeam: (id: string) => void;
  removeTournament: (id: string) => void;
  updateTournament: (id: string, details: TournamentDetails) => void;
  publish: (input: NewTournamentInput) => Promise<string>;
  reset: () => void;
};

const emptyState: AppState = {
  tournaments: [],
  teams: [],
  players: [],
  matches: [],
  events: [],
  myTeamId: null,
};

const serverSnapshot: Snapshot = { state: emptyState, booted: false, error: null };
let current: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();
let chain: Promise<unknown> = Promise.resolve();

const StoreContext = createContext<StoreApi | null>(null);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getServerSnapshot() {
  return serverSnapshot;
}

function getSnapshot() {
  return current;
}

function apply(state: AppState) {
  current = { state, booted: true, error: null };
  emit();
}

function enqueue<T>(task: () => Promise<T>) {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function send<T>(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Save failed");
  return data;
}

function attachTeam(
  prev: AppState,
  input: { tournamentId: string; teamId?: string; id?: string; name?: string; city?: string; groupId?: string },
): AppState {
  const tournament = prev.tournaments.find((item) => item.id === input.tournamentId);
  if (!tournament) return prev;
  const name = input.name?.trim().replace(/\s+/g, " ") ?? "";
  let team = input.teamId
    ? prev.teams.find((item) => item.id === input.teamId)
    : prev.teams.find((item) => name && teamKey(item.name) === teamKey(name));
  let teams = prev.teams;
  if (!team && name && input.id) {
    team = { id: input.id, name, city: input.city?.trim() ?? "" };
    teams = [...teams, team];
  }
  if (!team || tournament.teamIds.includes(team.id)) return { ...prev, teams };
  const chosen = team;
  const group =
    tournament.groups.find((item) => item.id === input.groupId) ??
    [...tournament.groups].sort((left, right) => left.teamIds.length - right.teamIds.length)[0];
  const groups = group
    ? tournament.groups.map((item) =>
        item.id === group.id ? { ...item, teamIds: [...item.teamIds, chosen.id] } : item,
      )
    : tournament.groups;
  const opponents = (groups.find((item) => item.id === group?.id)?.teamIds ?? []).filter((id) => id !== chosen.id);
  const taken = new Set(
    prev.matches
      .filter((match) => match.tournamentId === tournament.id)
      .flatMap((match) => {
        const pair = [match.homeTeamId, match.awayTeamId].filter(Boolean).sort().join(":");
        return pair ? [pair] : [];
      }),
  );
  const extras: Match[] = [];
  opponents.forEach((opponentId, index) => {
    const pair = [chosen.id, opponentId].sort().join(":");
    if (taken.has(pair)) return;
    const minutes = 18 * 60 + index * 45;
    extras.push({
      id: uid("m"),
      tournamentId: tournament.id,
      stage: "group",
      groupId: group?.id,
      homeTeamId: chosen.id,
      awayTeamId: opponentId,
      homeScore: 0,
      awayScore: 0,
      status: "scheduled",
      dayOffset: 0,
      time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      venue: tournament.venue || "Main pitch",
      clockSeconds: 0,
      clockRunning: false,
      clockAnchor: null,
      period: 1,
      onBreak: false,
    });
  });
  return {
    ...prev,
    teams,
    matches: [...prev.matches, ...extras],
    tournaments: prev.tournaments.map((item) =>
      item.id === tournament.id ? { ...item, teamIds: [...item.teamIds, chosen.id], groups } : item,
    ),
  };
}

function save(recipe: (prev: AppState) => AppState, request: () => Promise<AppState>) {
  const previous = current.state;
  const next = recipe(previous);
  if (next !== previous) {
    current = { ...current, state: next, error: null };
    emit();
  }
  return enqueue(async () => {
    try {
      apply(await request());
    } catch (error) {
      current = {
        state: previous,
        booted: true,
        error: error instanceof Error ? error.message : "Save failed",
      };
      emit();
    }
  });
}

const actions: Omit<StoreApi, "state"> = {
  addGoal: (matchId, teamId, playerId, assistPlayerId) => {
    const event: MatchEvent = {
      id: uid("e"),
      matchId,
      kind: "goal",
      teamId,
      playerId,
      relatedPlayerId: assistPlayerId,
      minute: minuteFor(matchId),
    };
    void save((prev) => appendEvent(prev, event), () =>
      send<AppState>(`/api/matches/${matchId}`, { action: "event", event }),
    );
  },
  addAssist: (matchId, teamId, playerId) => {
    const event: MatchEvent = {
      id: uid("e"),
      matchId,
      kind: "assist",
      teamId,
      playerId,
      minute: minuteFor(matchId),
    };
    void save((prev) => appendEvent(prev, event), () =>
      send<AppState>(`/api/matches/${matchId}`, { action: "event", event }),
    );
  },
  addSave: (matchId, teamId, playerId) => {
    const event: MatchEvent = {
      id: uid("e"),
      matchId,
      kind: "save",
      teamId,
      playerId,
      minute: minuteFor(matchId),
    };
    void save((prev) => appendEvent(prev, event), () =>
      send<AppState>(`/api/matches/${matchId}`, { action: "event", event }),
    );
  },
  addCard: (matchId, teamId, playerId, color) => {
    const event: MatchEvent = {
      id: uid("e"),
      matchId,
      kind: "card",
      teamId,
      playerId,
      cardColor: color,
      minute: minuteFor(matchId),
    };
    void save((prev) => appendEvent(prev, event), () =>
      send<AppState>(`/api/matches/${matchId}`, { action: "event", event }),
    );
  },
  addSub: (matchId, teamId, playerOffId, playerOnId) => {
    const event: MatchEvent = {
      id: uid("e"),
      matchId,
      kind: "substitution",
      teamId,
      playerId: playerOffId,
      relatedPlayerId: playerOnId,
      minute: minuteFor(matchId),
    };
    void save((prev) => appendEvent(prev, event), () =>
      send<AppState>(`/api/matches/${matchId}`, { action: "event", event }),
    );
  },
  undoLast: (matchId) => {
    void save(
      (prev) => {
        let index = -1;
        for (let eventIndex = prev.events.length - 1; eventIndex >= 0; eventIndex -= 1) {
          if (prev.events[eventIndex]?.matchId === matchId) {
            index = eventIndex;
            break;
          }
        }
        if (index < 0) return prev;
        const events = prev.events.filter((_, eventIndex) => eventIndex !== index);
        return {
          ...prev,
          events,
          matches: prev.matches.map((match) =>
            match.id === matchId ? syncScore(match, events) : match,
          ),
        };
      },
      () => send<AppState>(`/api/matches/${matchId}`, { action: "undo" }),
    );
  },
  startMatch: (matchId, homePlayerIds, awayPlayerIds) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) =>
          match.id === matchId
            ? {
                ...match,
                status: "live" as const,
                period: 1,
                onBreak: false,
                clockSeconds: 0,
                clockRunning: true,
                clockAnchor: new Date().toISOString(),
                homeStarterIds: homePlayerIds,
                awayStarterIds: awayPlayerIds,
              }
            : match,
        ),
      }),
      () =>
        send<AppState>(`/api/matches/${matchId}`, {
          action: "start",
          homePlayerIds,
          awayPlayerIds,
        }),
    );
  },
  pauseMatch: (matchId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) => {
          if (match.id !== matchId || match.status !== "live" || !match.clockRunning) return match;
          return {
            ...match,
            clockRunning: false,
            clockAnchor: null,
            clockSeconds: elapsedSeconds(match, Date.now()),
          };
        }),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "stop" }),
    );
  },
  resumeMatch: (matchId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) => {
          if (
            match.id !== matchId ||
            match.status !== "live" ||
            match.clockRunning ||
            match.onBreak ||
            match.clockSeconds >= HALF_LIMIT_SECONDS
          ) {
            return match;
          }
          return {
            ...match,
            clockRunning: true,
            clockAnchor: new Date().toISOString(),
          };
        }),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "resume" }),
    );
  },
  endHalf: (matchId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) => {
          if (match.id !== matchId || match.status !== "live") return match;
          return {
            ...match,
            clockRunning: false,
            clockAnchor: null,
            clockSeconds: elapsedSeconds(match, match.clockAnchor ? Date.now() : null),
            onBreak: match.period !== 2,
          };
        }),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "end-half" }),
    );
  },
  startSecondHalf: (matchId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) =>
          match.id === matchId
            ? {
                ...match,
                period: 2 as const,
                onBreak: false,
                clockSeconds: 0,
                clockRunning: true,
                clockAnchor: new Date().toISOString(),
              }
            : match,
        ),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "second-half" }),
    );
  },
  endMatch: (matchId, penaltyWinnerId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) => {
          if (match.id !== matchId) return match;
          const levelKnockout = match.stage === "knockout" && match.homeScore === match.awayScore;
          return {
            ...match,
            status: "finished" as const,
            clockRunning: false,
            clockAnchor: null,
            clockSeconds: elapsedSeconds(match, match.clockAnchor ? Date.now() : null),
            penaltyWinnerId: levelKnockout ? penaltyWinnerId ?? null : null,
          };
        }),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "end", penaltyWinnerId }),
    );
  },
  recordPenalties: (matchId, teamId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) =>
          match.id === matchId ? { ...match, penaltyWinnerId: teamId } : match,
        ),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "penalties", teamId }),
    );
  },
  armClock: (matchId) => {
    void save(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((match) =>
          match.id === matchId && match.clockRunning && !match.clockAnchor
            ? { ...match, clockAnchor: new Date().toISOString() }
            : match,
        ),
      }),
      () => send<AppState>(`/api/matches/${matchId}`, { action: "clock" }),
    );
  },
  setMyTeam: (teamId) => {
    void save(
      (prev) => ({ ...prev, myTeamId: teamId }),
      () => send<AppState>("/api/settings/my-team", { teamId }, "PUT"),
    );
  },
  addPlayer: (player) => {
    const next = { ...player, id: uid("p") };
    void save(
      (prev) => ({ ...prev, players: [...prev.players, next] }),
      () => send<AppState>("/api/players", next),
    );
  },
  updatePlayer: (id, patch) => {
    void save(
      (prev) => ({
        ...prev,
        players: prev.players.map((player) =>
          player.id === id ? { ...player, ...patch } : player,
        ),
      }),
      () => send<AppState>(`/api/players/${id}`, patch, "PATCH"),
    );
  },
  removePlayer: (id) => {
    void save(
      (prev) => ({
        ...prev,
        players: prev.players.filter((player) => player.id !== id),
      }),
      () => send<AppState>(`/api/players/${id}`, {}, "DELETE"),
    );
  },
  addTeam: (team) => {
    const name = team.name.trim().replace(/\s+/g, " ");
    const city = team.city.trim();
    const id = uid("t");
    if (!name) return;
    void save(
      (prev) => {
        if (prev.teams.some((item) => teamKey(item.name) === teamKey(name))) return prev;
        return { ...prev, teams: [...prev.teams, { id, name, city }] };
      },
      () => send<AppState>("/api/teams", { id, name, city }),
    );
  },
  addTeamToTournament: (input) => {
    const createdId = input.teamId ? undefined : uid("t");
    void save(
      (prev) => attachTeam(prev, { ...input, id: createdId }),
      () => send<AppState>(`/api/tournaments/${input.tournamentId}/teams`, { ...input, id: createdId }),
    );
  },
  removeTeam: (id) => {
    void save(
      (prev) => {
        const playerIds = new Set(prev.players.filter((player) => player.teamId === id).map((player) => player.id));
        return {
          ...prev,
          teams: prev.teams.filter((team) => team.id !== id),
          players: prev.players.filter((player) => player.teamId !== id),
          myTeamId: prev.myTeamId === id ? null : prev.myTeamId,
          tournaments: prev.tournaments.map((tournament) => ({
            ...tournament,
            teamIds: tournament.teamIds.filter((teamId) => teamId !== id),
            groups: tournament.groups.map((group) => ({
              ...group,
              teamIds: group.teamIds.filter((teamId) => teamId !== id),
            })),
          })),
          matches: prev.matches.map((match) => ({
            ...match,
            homeTeamId: match.homeTeamId === id ? null : match.homeTeamId,
            awayTeamId: match.awayTeamId === id ? null : match.awayTeamId,
          })),
          events: prev.events.filter(
            (event) =>
              event.teamId !== id &&
              !playerIds.has(event.playerId) &&
              !(event.relatedPlayerId && playerIds.has(event.relatedPlayerId)),
          ),
        };
      },
      () => send<AppState>(`/api/teams/${id}`, {}, "DELETE"),
    );
  },
  removeTournament: (id) => {
    void save(
      (prev) => {
        const matchIds = new Set(
          prev.matches.filter((match) => match.tournamentId === id).map((match) => match.id),
        );
        return {
          ...prev,
          tournaments: prev.tournaments.filter((tournament) => tournament.id !== id),
          matches: prev.matches.filter((match) => match.tournamentId !== id),
          events: prev.events.filter((event) => !matchIds.has(event.matchId)),
        };
      },
      () => send<AppState>(`/api/tournaments/${id}`, {}, "DELETE"),
    );
  },
  updateTournament: (id, details) => {
    const next = {
      name: details.name.trim(),
      city: details.city.trim(),
      venue: details.venue.trim(),
      format: details.format,
      startLabel: details.startLabel.trim(),
      endLabel: details.endLabel.trim(),
    };
    void save(
      (prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((tournament) =>
          tournament.id === id ? { ...tournament, ...next } : tournament,
        ),
        matches: prev.matches.map((match) =>
          match.tournamentId === id && match.status === "scheduled" && next.venue
            ? { ...match, venue: next.venue }
            : match,
        ),
      }),
      () => send<AppState>(`/api/tournaments/${id}`, next, "PATCH"),
    );
  },
  publish: (input) =>
    enqueue(async () => {
      const result = await send<{ slug: string; state: AppState }>("/api/tournaments", input);
      apply(result.state);
      return result.slug;
    }),
  reset: () => {
    void enqueue(async () => {
      apply(await send<AppState>("/api/reset", {}));
    });
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/state")
      .then(async (response) => {
        const data = (await response.json()) as AppState & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load Futty");
        return data;
      })
      .then((state) => {
        if (!cancelled) apply(state);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        current = {
          state: emptyState,
          booted: true,
          error: error instanceof Error ? error.message : "Could not load Futty",
        };
        emit();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const api = useMemo<StoreApi>(() => ({ state: snap.state, ...actions }), [snap.state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function DataGate({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const blocked = !snap.booted || (Boolean(snap.error) && snap.state.tournaments.length === 0);

  return (
    <>
      {!snap.booted ? <Loader /> : null}
      {snap.error && snap.state.tournaments.length === 0 ? (
        <div>
          <h1 className="text-headline-lg">Futty could not reach the database.</h1>
          <p className="mt-2 text-on-surface-variant">{snap.error}</p>
        </div>
      ) : null}
      <div className={blocked ? "hidden" : undefined}>
        {snap.error && snap.state.tournaments.length > 0 ? (
          <p className="mb-4 rounded-xl bg-error-container px-4 py-3 text-on-error-container">
            {snap.error}
          </p>
        ) : null}
        {children}
      </div>
    </>
  );
}

export function useApp() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

function minuteFor(matchId: string) {
  const match = current.state.matches.find((item) => item.id === matchId);
  if (!match) return 0;
  return Math.floor(elapsedSeconds(match, match.clockAnchor ? Date.now() : null) / 60);
}

function appendEvent(state: AppState, event: MatchEvent): AppState {
  const match = state.matches.find((item) => item.id === event.matchId);
  if (!match || match.status !== "live") return state;
  const events = [...state.events, event];
  return {
    ...state,
    events,
    matches: state.matches.map((item) =>
      item.id === event.matchId ? syncScore(item, events) : item,
    ),
  };
}

function syncScore(match: AppState["matches"][number], events: MatchEvent[]) {
  const goals = events.filter((event) => event.matchId === match.id && event.kind === "goal");
  return {
    ...match,
    homeScore: goals.filter((event) => event.teamId === match.homeTeamId).length,
    awayScore: goals.filter((event) => event.teamId === match.awayTeamId).length,
  };
}
