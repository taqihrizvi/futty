import { readFileSync } from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import { knockoutUpdates } from "@/lib/knockout";
import { publishTournament, teamKey } from "@/lib/publish";
import { createSeed } from "@/lib/seed";
import type { AppState, Format, Match, MatchEvent, NewTournamentInput, Player, TournamentDetails } from "@/lib/types";
import { HALF_LIMIT_SECONDS } from "@/lib/format";
import { isSentOff, onPitchIds, sideSize } from "@/lib/lineup";
import { uid } from "@/lib/ids";
import { getPool } from "./db";
import { seedOrganizer } from "./users";

const schemaPath = path.join(process.cwd(), "src", "server", "schema.sql");

let ready: Promise<void> | null = null;

export function ensureReady() {
  if (!ready) {
    ready = prepare().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function prepare() {
  const sql = readFileSync(schemaPath, "utf8");
  await getPool().query(sql);
  await seedOrganizer();
  await dedupeTeams();
}

async function dedupeTeams() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const teams = await client.query<{ id: string; name: string; players: number; links: number }>(
      `SELECT t.id,
              t.name,
              (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id)::int AS players,
              (
                (SELECT COUNT(*) FROM matches m WHERE m.home_team_id = t.id OR m.away_team_id = t.id)
                + (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.team_id = t.id)
              )::int AS links
       FROM teams t`,
    );
    const groups = new Map<string, { id: string; players: number; links: number }[]>();
    for (const team of teams.rows) {
      const key = teamKey(team.name);
      const list = groups.get(key) ?? [];
      list.push(team);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      list.sort((a, b) => b.players - a.players || b.links - a.links || a.id.localeCompare(b.id));
      const keeper = list[0].id;
      for (const duplicate of list.slice(1)) {
        await mergeTeam(client, keeper, duplicate.id);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function mergeTeam(client: PoolClient, keeper: string, duplicate: string) {
  await client.query("UPDATE matches SET home_team_id = $1 WHERE home_team_id = $2", [keeper, duplicate]);
  await client.query("UPDATE matches SET away_team_id = $1 WHERE away_team_id = $2", [keeper, duplicate]);
  await client.query("UPDATE match_events SET team_id = $1 WHERE team_id = $2", [keeper, duplicate]);

  const players = await client.query<{ id: string; name: string; shirt_number: number }>(
    "SELECT id, name, shirt_number FROM players WHERE team_id = $1",
    [duplicate],
  );
  for (const player of players.rows) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM players
       WHERE team_id = $1 AND lower(name) = lower($2) AND shirt_number = $3
       LIMIT 1`,
      [keeper, player.name, player.shirt_number],
    );
    const keeperPlayer = existing.rows[0]?.id;
    if (keeperPlayer) {
      await client.query("UPDATE match_events SET player_id = $1 WHERE player_id = $2", [keeperPlayer, player.id]);
      await client.query(
        "UPDATE match_events SET related_player_id = $1 WHERE related_player_id = $2",
        [keeperPlayer, player.id],
      );
      await client.query("DELETE FROM players WHERE id = $1", [player.id]);
    } else {
      await client.query("UPDATE players SET team_id = $1 WHERE id = $2", [keeper, player.id]);
    }
  }

  await client.query(
    `INSERT INTO tournament_teams (tournament_id, team_id)
     SELECT tournament_id, $1 FROM tournament_teams WHERE team_id = $2
     ON CONFLICT DO NOTHING`,
    [keeper, duplicate],
  );
  await client.query(
    `INSERT INTO group_teams (group_id, team_id)
     SELECT group_id, $1 FROM group_teams WHERE team_id = $2
     ON CONFLICT DO NOTHING`,
    [keeper, duplicate],
  );
  await client.query("UPDATE settings SET value = $1 WHERE key = 'my_team_id' AND value = $2", [keeper, duplicate]);
  await client.query("DELETE FROM teams WHERE id = $1", [duplicate]);
}

async function readState(): Promise<AppState> {
  const db = await getPool().connect();
  try {
  const [teams, players, tournaments, tournamentTeams, groups, groupTeams, rounds, matches, starters, events, settings] =
    await Promise.all([
      db.query<{ id: string; name: string; city: string }>("SELECT id, name, city FROM teams ORDER BY name"),
      db.query<{ id: string; team_id: string; name: string; shirt_number: number; position: string | null }>(
        "SELECT id, team_id, name, shirt_number, position FROM players ORDER BY shirt_number",
      ),
      db.query<{
        id: string;
        slug: string;
        name: string;
        city: string;
        venue: string;
        format: AppState["tournaments"][number]["format"];
        start_label: string;
        end_label: string;
        qualify_per_group: number;
      }>("SELECT id, slug, name, city, venue, format, start_label, end_label, qualify_per_group FROM tournaments"),
      db.query<{ tournament_id: string; team_id: string }>(
        "SELECT tournament_id, team_id FROM tournament_teams",
      ),
      db.query<{ id: string; tournament_id: string; name: string }>(
        "SELECT id, tournament_id, name FROM groups ORDER BY name",
      ),
      db.query<{ group_id: string; team_id: string }>("SELECT group_id, team_id FROM group_teams"),
      db.query<{ tournament_id: string; round: AppState["tournaments"][number]["knockoutRounds"][number] }>(
        "SELECT tournament_id, round FROM tournament_rounds ORDER BY sort_order",
      ),
      db.query<{
        id: string;
        tournament_id: string;
        stage: Match["stage"];
        group_id: string | null;
        round: Match["round"] | null;
        home_team_id: string | null;
        away_team_id: string | null;
        home_from_match_id: string | null;
        away_from_match_id: string | null;
        home_label: string | null;
        away_label: string | null;
        home_score: number;
        away_score: number;
        status: Match["status"];
        kickoff_at: Date;
        venue: string;
        clock_seconds: number;
        clock_running: boolean;
        clock_anchor: Date | null;
        period: number;
        on_break: boolean;
        penalty_winner_id: string | null;
      }>("SELECT * FROM matches"),
      db.query<{ match_id: string; team_id: string; player_id: string }>(
        "SELECT match_id, team_id, player_id FROM match_starters",
      ),
      db.query<{
        id: string;
        match_id: string;
        kind: MatchEvent["kind"];
        team_id: string;
        player_id: string;
        related_player_id: string | null;
        card_color: MatchEvent["cardColor"] | null;
        minute: number;
      }>("SELECT * FROM match_events ORDER BY created_at, id"),
      db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'my_team_id'"),
    ]);

  return {
    teams: teams.rows,
    players: players.rows.map((player) => ({
      id: player.id,
      teamId: player.team_id,
      name: player.name,
      number: player.shirt_number,
      position: player.position,
    })),
    tournaments: tournaments.rows.map((tournament) => ({
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      city: tournament.city,
      venue: tournament.venue,
      format: tournament.format,
      startLabel: tournament.start_label,
      endLabel: tournament.end_label,
      qualifyPerGroup: tournament.qualify_per_group,
      teamIds: tournamentTeams.rows
        .filter((row) => row.tournament_id === tournament.id)
        .map((row) => row.team_id),
      groups: groups.rows
        .filter((group) => group.tournament_id === tournament.id)
        .map((group) => ({
          id: group.id,
          name: group.name,
          teamIds: groupTeams.rows
            .filter((row) => row.group_id === group.id)
            .map((row) => row.team_id),
        })),
      knockoutRounds: rounds.rows
        .filter((row) => row.tournament_id === tournament.id)
        .map((row) => row.round),
    })),
    matches: matches.rows.map((match) => {
      const kick = kickoffParts(match.kickoff_at);
      const homeStarterIds = starters.rows
        .filter((row) => row.match_id === match.id && row.team_id === match.home_team_id)
        .map((row) => row.player_id);
      const awayStarterIds = starters.rows
        .filter((row) => row.match_id === match.id && row.team_id === match.away_team_id)
        .map((row) => row.player_id);
      return {
        id: match.id,
        tournamentId: match.tournament_id,
        stage: match.stage,
        groupId: match.group_id ?? undefined,
        round: match.round ?? undefined,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeFromMatchId: match.home_from_match_id ?? undefined,
        awayFromMatchId: match.away_from_match_id ?? undefined,
        homeLabel: match.home_label ?? undefined,
        awayLabel: match.away_label ?? undefined,
        homeScore: match.home_score,
        awayScore: match.away_score,
        status: match.status,
        dayOffset: kick.dayOffset,
        time: kick.time,
        venue: match.venue,
        clockSeconds: match.clock_seconds,
        clockRunning: match.clock_running,
        clockAnchor: match.clock_anchor ? match.clock_anchor.toISOString() : null,
        period: match.period === 2 ? 2 : 1,
        onBreak: match.on_break,
        penaltyWinnerId: match.penalty_winner_id,
        ...(homeStarterIds.length ? { homeStarterIds } : {}),
        ...(awayStarterIds.length ? { awayStarterIds } : {}),
      };
    }),
    events: events.rows.map((event) => ({
      id: event.id,
      matchId: event.match_id,
      kind: event.kind,
      teamId: event.team_id,
      playerId: event.player_id,
      relatedPlayerId: event.related_player_id ?? undefined,
      cardColor: event.card_color ?? undefined,
      minute: event.minute,
    })),
    myTeamId: settings.rows[0]?.value ?? null,
  };
  } finally {
    db.release();
  }
}

export async function loadState(): Promise<AppState> {
  await ensureReady();
  return placeKnockoutTeams(await readState());
}

async function placeKnockoutTeams(state: AppState) {
  const updates = knockoutUpdates(state);
  if (updates.length === 0) return state;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const update of updates) {
      await client.query(
        `UPDATE matches
         SET home_team_id = COALESCE($2, home_team_id),
             away_team_id = COALESCE($3, away_team_id),
             home_label = CASE WHEN $4 = '' THEN home_label ELSE $4 END,
             away_label = CASE WHEN $5 = '' THEN away_label ELSE $5 END,
             home_from_match_id = CASE WHEN $6 THEN NULL ELSE home_from_match_id END,
             away_from_match_id = CASE WHEN $6 THEN NULL ELSE away_from_match_id END
         WHERE id = $1 AND status = 'scheduled'`,
        [
          update.matchId,
          update.homeTeamId ?? null,
          update.awayTeamId ?? null,
          update.homeLabel,
          update.awayLabel,
          update.clearSource,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const byId = new Map(updates.map((update) => [update.matchId, update]));
  return {
    ...state,
    matches: state.matches.map((match) => {
      const update = byId.get(match.id);
      if (!update) return match;
      return {
        ...match,
        homeTeamId: update.homeTeamId ?? match.homeTeamId,
        awayTeamId: update.awayTeamId ?? match.awayTeamId,
        homeLabel: update.homeLabel || match.homeLabel,
        awayLabel: update.awayLabel || match.awayLabel,
        homeFromMatchId: update.clearSource ? undefined : match.homeFromMatchId,
        awayFromMatchId: update.clearSource ? undefined : match.awayFromMatchId,
      };
    }),
  };
}

export async function replaceState(state: AppState) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
        match_starters,
        match_events,
        matches,
        group_teams,
        groups,
        tournament_rounds,
        tournament_teams,
        players,
        teams,
        tournaments,
        settings
      RESTART IDENTITY CASCADE
    `);
    await insertState(client, state);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetState() {
  await ensureReady();
  await replaceState(createSeed());
  return loadState();
}

export async function publishNewTournament(input: NewTournamentInput) {
  await ensureReady();
  const current = await loadState();
  const published = publishTournament(current, input);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await insertState(client, {
      ...published.state,
      teams: published.state.teams.filter((team) => !current.teams.some((item) => item.id === team.id)),
      players: [],
      tournaments: published.state.tournaments.filter((tournament) => tournament.id !== current.tournaments.find((item) => item.id === tournament.id)?.id),
      matches: published.state.matches.filter((match) => !current.matches.some((item) => item.id === match.id)),
      events: [],
      myTeamId: current.myTeamId,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { slug: published.slug, state: await loadState() };
}

export async function addTeam(input: { id?: string; name: string; city?: string }) {
  await ensureReady();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Add a team name");
  const city = input.city?.trim() ?? "";
  const existing = await findTeamByName(name);
  if (existing) return loadState();
  await getPool().query("INSERT INTO teams (id, name, city) VALUES ($1, $2, $3)", [
    input.id || uid("t"),
    name,
    city,
  ]);
  return loadState();
}

export async function addTeamToTournament(
  tournamentId: string,
  input: { teamId?: string; id?: string; name?: string; city?: string; groupId?: string },
) {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tournament = await client.query<{ venue: string }>(
      "SELECT venue FROM tournaments WHERE id = $1",
      [tournamentId],
    );
    if (!tournament.rows[0]) throw new Error("Tournament not found");

    let teamId = input.teamId;
    if (!teamId) {
      const name = input.name?.trim().replace(/\s+/g, " ") ?? "";
      if (!name) throw new Error("Choose a team or add a name");
      const existing = await findTeamByName(name, client);
      if (existing) {
        teamId = existing;
      } else {
        teamId = input.id || uid("t");
        await client.query("INSERT INTO teams (id, name, city) VALUES ($1, $2, $3)", [
          teamId,
          name,
          input.city?.trim() ?? "",
        ]);
      }
    }

    const already = await client.query(
      "SELECT 1 FROM tournament_teams WHERE tournament_id = $1 AND team_id = $2",
      [tournamentId, teamId],
    );
    if ((already.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      return loadState();
    }

    let groupId = input.groupId;
    if (!groupId) {
      const groups = await client.query<{ id: string; size: number }>(
        `SELECT groups.id, COUNT(group_teams.team_id)::int AS size
         FROM groups
         LEFT JOIN group_teams ON group_teams.group_id = groups.id
         WHERE groups.tournament_id = $1
         GROUP BY groups.id
         ORDER BY size, groups.name
         LIMIT 1`,
        [tournamentId],
      );
      groupId = groups.rows[0]?.id;
    }
    if (!groupId) {
      groupId = uid("g");
      await client.query("INSERT INTO groups (id, tournament_id, name) VALUES ($1, $2, 'Group A')", [
        groupId,
        tournamentId,
      ]);
    }

    await client.query(
      "INSERT INTO tournament_teams (tournament_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [tournamentId, teamId],
    );
    await client.query(
      "INSERT INTO group_teams (group_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [groupId, teamId],
    );

    const opponents = await client.query<{ team_id: string }>(
      "SELECT team_id FROM group_teams WHERE group_id = $1 AND team_id <> $2",
      [groupId, teamId],
    );
    const venue = tournament.rows[0].venue || "Main pitch";
    let slot = 0;
    for (const opponent of opponents.rows) {
      const played = await client.query(
        `SELECT 1 FROM matches
         WHERE tournament_id = $1
           AND (
             (home_team_id = $2 AND away_team_id = $3)
             OR (home_team_id = $3 AND away_team_id = $2)
           )
         LIMIT 1`,
        [tournamentId, teamId, opponent.team_id],
      );
      if ((played.rowCount ?? 0) > 0) continue;
      const minutes = 18 * 60 + slot * 45;
      slot += 1;
      const kickoff = kickoffDate(0, `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
      await client.query(
        `INSERT INTO matches (
          id, tournament_id, stage, group_id, home_team_id, away_team_id,
          home_score, away_score, status, kickoff_at, venue,
          clock_seconds, clock_running, period, on_break
        ) VALUES (
          $1, $2, 'group', $3, $4, $5,
          0, 0, 'scheduled', $6, $7,
          0, false, 1, false
        )`,
        [uid("m"), tournamentId, groupId, teamId, opponent.team_id, kickoff, venue],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

async function findTeamByName(name: string, client?: PoolClient) {
  const db = client ?? getPool();
  const result = await db.query<{ id: string; name: string }>("SELECT id, name FROM teams");
  return result.rows.find((team) => teamKey(team.name) === teamKey(name))?.id;
}

export async function addPlayer(player: Player) {
  await ensureReady();
  await getPool().query(
    "INSERT INTO players (id, team_id, name, shirt_number, position) VALUES ($1, $2, $3, $4, $5)",
    [player.id, player.teamId, player.name, player.number, player.position || null],
  );
  return loadState();
}

export async function updatePlayer(id: string, patch: Partial<Omit<Player, "id">>) {
  await ensureReady();
  const current = await getPool().query<{
    name: string;
    shirt_number: number;
    position: string | null;
    team_id: string;
  }>("SELECT name, shirt_number, position, team_id FROM players WHERE id = $1", [id]);
  const row = current.rows[0];
  if (!row) throw new Error("Player not found");
  await getPool().query(
    "UPDATE players SET name = $2, shirt_number = $3, position = $4, team_id = $5 WHERE id = $1",
    [
      id,
      patch.name ?? row.name,
      patch.number ?? row.shirt_number,
      patch.position !== undefined ? patch.position || null : row.position,
      patch.teamId ?? row.team_id,
    ],
  );
  return loadState();
}

export async function removePlayer(id: string) {
  await ensureReady();
  await getPool().query("DELETE FROM players WHERE id = $1", [id]);
  return loadState();
}

export async function removeTeam(id: string) {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM match_events
       WHERE team_id = $1
          OR player_id IN (SELECT id FROM players WHERE team_id = $1)
          OR related_player_id IN (SELECT id FROM players WHERE team_id = $1)`,
      [id],
    );
    await client.query("UPDATE matches SET home_team_id = NULL WHERE home_team_id = $1", [id]);
    await client.query("UPDATE matches SET away_team_id = NULL WHERE away_team_id = $1", [id]);
    await client.query("DELETE FROM settings WHERE key = 'my_team_id' AND value = $1", [id]);
    const removed = await client.query("DELETE FROM teams WHERE id = $1", [id]);
    if (removed.rowCount === 0) throw new Error("Team not found");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

export async function removeTournament(id: string) {
  await ensureReady();
  const removed = await getPool().query("DELETE FROM tournaments WHERE id = $1", [id]);
  if (removed.rowCount === 0) throw new Error("Tournament not found");
  return loadState();
}

const FORMATS = new Set<Format>(["5v5", "6v6", "7v7", "11v11"]);

export async function updateTournament(id: string, patch: TournamentDetails) {
  await ensureReady();
  const name = patch.name?.trim() ?? "";
  if (!name) throw new Error("Add a tournament name");
  if (!FORMATS.has(patch.format)) throw new Error("Choose a format");
  const city = patch.city?.trim() ?? "";
  const venue = patch.venue?.trim() ?? "";
  const startLabel = patch.startLabel?.trim() ?? "";
  const endLabel = patch.endLabel?.trim() ?? "";
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE tournaments
       SET name = $2, city = $3, venue = $4, format = $5, start_label = $6, end_label = $7
       WHERE id = $1`,
      [id, name, city, venue, patch.format, startLabel, endLabel],
    );
    if (updated.rowCount === 0) throw new Error("Tournament not found");
    if (venue) {
      await client.query(
        "UPDATE matches SET venue = $2 WHERE tournament_id = $1 AND status = 'scheduled'",
        [id, venue],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

export async function setMyTeam(teamId: string | null) {
  await ensureReady();
  if (!teamId) {
    await getPool().query("DELETE FROM settings WHERE key = 'my_team_id'");
  } else {
    await getPool().query(
      `INSERT INTO settings (key, value) VALUES ('my_team_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [teamId],
    );
  }
  return loadState();
}

export async function addMatchEvent(event: MatchEvent) {
  await ensureReady();
  const found = await getPool().query<{
    status: string;
    home_team_id: string | null;
    away_team_id: string | null;
    clock_seconds: number;
    clock_running: boolean;
    clock_anchor: Date | null;
  }>(
    `SELECT status, home_team_id, away_team_id, clock_seconds, clock_running, clock_anchor
     FROM matches WHERE id = $1`,
    [event.matchId],
  );
  const match = found.rows[0];
  if (!match || match.status !== "live") throw new Error("Match is not live");
  await assertLineupEvent(event, match.home_team_id, match.away_team_id);
  const minute = Math.floor(elapsed(match) / 60);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO match_events
        (id, match_id, kind, team_id, player_id, related_player_id, card_color, minute)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.id,
        event.matchId,
        event.kind,
        event.teamId,
        event.playerId,
        event.relatedPlayerId ?? null,
        event.cardColor ?? null,
        minute,
      ],
    );
    await syncScore(client, event.matchId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

export async function undoMatchEvent(matchId: string) {
  await ensureReady();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM match_events
       WHERE id = (
         SELECT id FROM match_events
         WHERE match_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       )`,
      [matchId],
    );
    await syncScore(client, matchId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

export async function startMatch(matchId: string, homePlayerIds: string[], awayPlayerIds: string[]) {
  await ensureReady();
  const found = await getPool().query<{
    status: string;
    home_team_id: string | null;
    away_team_id: string | null;
    format: string;
  }>(
    `SELECT m.status, m.home_team_id, m.away_team_id, t.format
     FROM matches AS m
     JOIN tournaments AS t ON t.id = m.tournament_id
     WHERE m.id = $1`,
    [matchId],
  );
  const match = found.rows[0];
  if (!match || match.status !== "scheduled") throw new Error("This match cannot be started");
  if (!match.home_team_id || !match.away_team_id) throw new Error("Both teams are needed before kickoff");
  const size = sideSize(match.format);
  assertStarterCount(homePlayerIds, size);
  assertStarterCount(awayPlayerIds, size);
  const players = await getPool().query<{ id: string; team_id: string }>(
    "SELECT id, team_id FROM players WHERE id = ANY($1::text[])",
    [[...homePlayerIds, ...awayPlayerIds]],
  );
  const teamByPlayer = new Map(players.rows.map((player) => [player.id, player.team_id]));
  if (homePlayerIds.some((id) => teamByPlayer.get(id) !== match.home_team_id)) {
    throw new Error("Pick starting players from the home squad");
  }
  if (awayPlayerIds.some((id) => teamByPlayer.get(id) !== match.away_team_id)) {
    throw new Error("Pick starting players from the away squad");
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM match_starters WHERE match_id = $1", [matchId]);
    for (const playerId of homePlayerIds) {
      await client.query(
        "INSERT INTO match_starters (match_id, team_id, player_id) VALUES ($1, $2, $3)",
        [matchId, match.home_team_id, playerId],
      );
    }
    for (const playerId of awayPlayerIds) {
      await client.query(
        "INSERT INTO match_starters (match_id, team_id, player_id) VALUES ($1, $2, $3)",
        [matchId, match.away_team_id, playerId],
      );
    }
    const updated = await client.query(
      `UPDATE matches
       SET status = 'live',
           period = 1,
           on_break = false,
           clock_seconds = 0,
           clock_running = true,
           clock_anchor = now()
       WHERE id = $1 AND status = 'scheduled'`,
      [matchId],
    );
    if (updated.rowCount !== 1) throw new Error("This match cannot be started");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return loadState();
}

function assertStarterCount(ids: string[], size: number) {
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== size) {
    throw new Error(`Pick ${size} starting players for each side`);
  }
}

async function assertLineupEvent(event: MatchEvent, homeTeamId: string | null, awayTeamId: string | null) {
  const starters = await getPool().query<{ team_id: string; player_id: string }>(
    "SELECT team_id, player_id FROM match_starters WHERE match_id = $1",
    [event.matchId],
  );
  if (starters.rows.length === 0) return;
  const recorded = await getPool().query<{
    id: string;
    kind: MatchEvent["kind"];
    team_id: string;
    player_id: string;
    related_player_id: string | null;
    card_color: MatchEvent["cardColor"] | null;
    minute: number;
  }>(
    `SELECT id, kind, team_id, player_id, related_player_id, card_color, minute
     FROM match_events
     WHERE match_id = $1
     ORDER BY created_at, id`,
    [event.matchId],
  );
  const events: MatchEvent[] = recorded.rows.map((row) => ({
    id: row.id,
    matchId: event.matchId,
    kind: row.kind,
    teamId: row.team_id,
    playerId: row.player_id,
    relatedPlayerId: row.related_player_id ?? undefined,
    cardColor: row.card_color ?? undefined,
    minute: row.minute,
  }));
  if (event.teamId !== homeTeamId && event.teamId !== awayTeamId) throw new Error("Pick a team in this match");
  const ids = starters.rows.filter((row) => row.team_id === event.teamId).map((row) => row.player_id);
  const on = onPitchIds(ids, events, event.teamId);
  if (event.kind === "substitution") {
    if (!event.relatedPlayerId || event.relatedPlayerId === event.playerId) {
      throw new Error("Pick the player coming on");
    }
    if (!on.has(event.playerId)) throw new Error("That player is not on the pitch");
    if (on.has(event.relatedPlayerId)) throw new Error("That player is already on the pitch");
    if (isSentOff(events, event.relatedPlayerId)) throw new Error("That player is sent off and cannot return");
    await assertSquadPlayer(event.playerId, event.teamId);
    await assertSquadPlayer(event.relatedPlayerId, event.teamId);
    return;
  }
  if (!on.has(event.playerId)) throw new Error("That player is not on the pitch");
  if (event.relatedPlayerId && !on.has(event.relatedPlayerId)) {
    throw new Error("Pick a player who is on the pitch");
  }
}

async function assertSquadPlayer(playerId: string, teamId: string) {
  const found = await getPool().query<{ team_id: string }>("SELECT team_id FROM players WHERE id = $1", [playerId]);
  if (found.rows[0]?.team_id !== teamId) throw new Error("Pick a player from that squad");
}

export async function pauseMatch(matchId: string) {
  await ensureReady();
  const match = await getMatch(matchId);
  if (!match || match.status !== "live" || !match.clock_running) throw new Error("Match clock is not running");
  const seconds = Math.min(HALF_LIMIT_SECONDS, elapsed(match));
  await getPool().query(
    "UPDATE matches SET clock_running = false, clock_anchor = NULL, clock_seconds = $2 WHERE id = $1",
    [matchId, seconds],
  );
  return loadState();
}

export async function resumeMatch(matchId: string) {
  await ensureReady();
  await getPool().query(
    `UPDATE matches
     SET clock_running = true, clock_anchor = now()
     WHERE id = $1 AND status = 'live' AND clock_running = false AND on_break = false
       AND clock_seconds < $2`,
    [matchId, HALF_LIMIT_SECONDS],
  );
  return loadState();
}

export async function endMatch(matchId: string, penaltyWinnerId?: string) {
  await ensureReady();
  const found = await getPool().query<{
    stage: string;
    home_team_id: string | null;
    away_team_id: string | null;
    home_score: number;
    away_score: number;
    clock_seconds: number;
    clock_running: boolean;
    clock_anchor: Date | null;
  }>(
    `SELECT stage, home_team_id, away_team_id, home_score, away_score,
            clock_seconds, clock_running, clock_anchor
     FROM matches WHERE id = $1`,
    [matchId],
  );
  const match = found.rows[0];
  if (!match) throw new Error("Match not found");
  const winner = penaltyWinner(match, penaltyWinnerId);
  await getPool().query(
    `UPDATE matches
     SET status = 'finished',
         clock_running = false,
         clock_anchor = NULL,
         clock_seconds = $2,
         penalty_winner_id = $3
     WHERE id = $1`,
    [matchId, Math.min(HALF_LIMIT_SECONDS, elapsed(match)), winner],
  );
  return loadState();
}

export async function recordPenalties(matchId: string, teamId: string) {
  await ensureReady();
  const updated = await getPool().query(
    `UPDATE matches
     SET penalty_winner_id = $2
     WHERE id = $1
       AND status = 'finished'
       AND stage = 'knockout'
       AND home_score = away_score
       AND (home_team_id = $2 OR away_team_id = $2)`,
    [matchId, teamId],
  );
  if ((updated.rowCount ?? 0) === 0) throw new Error("Penalties can only decide a level knockout");
  return loadState();
}

function penaltyWinner(
  match: { stage: string; home_team_id: string | null; away_team_id: string | null; home_score: number; away_score: number },
  teamId?: string,
) {
  if (match.stage !== "knockout" || match.home_score !== match.away_score) return null;
  if (teamId !== match.home_team_id && teamId !== match.away_team_id) {
    throw new Error("Pick the team that won on penalties");
  }
  return teamId;
}

export async function endHalf(matchId: string) {
  await ensureReady();
  const match = await getMatch(matchId);
  if (!match || match.status !== "live") throw new Error("Match is not live");
  const seconds = Math.min(HALF_LIMIT_SECONDS, elapsed(match));
  await getPool().query(
    `UPDATE matches
     SET clock_running = false,
         clock_anchor = NULL,
         clock_seconds = $2,
         on_break = $3
     WHERE id = $1`,
    [matchId, seconds, match.period !== 2],
  );
  return loadState();
}

export async function startSecondHalf(matchId: string) {
  await ensureReady();
  await getPool().query(
    `UPDATE matches
     SET period = 2,
         on_break = false,
         clock_seconds = 0,
         clock_running = true,
         clock_anchor = now()
     WHERE id = $1 AND status = 'live' AND on_break = true AND period = 1`,
    [matchId],
  );
  return loadState();
}

export async function armClock(matchId: string) {
  await ensureReady();
  await getPool().query(
    `UPDATE matches
     SET clock_anchor = now()
     WHERE id = $1 AND clock_running = true AND clock_anchor IS NULL`,
    [matchId],
  );
  return loadState();
}

async function getMatch(matchId: string) {
  const result = await getPool().query<{
    status: string;
    clock_seconds: number;
    clock_running: boolean;
    clock_anchor: Date | null;
    period: number;
  }>(
    "SELECT status, clock_seconds, clock_running, clock_anchor, period FROM matches WHERE id = $1",
    [matchId],
  );
  return result.rows[0] ?? null;
}

function elapsed(match: {
  clock_seconds: number;
  clock_running: boolean;
  clock_anchor: Date | null;
}) {
  if (!match.clock_running || !match.clock_anchor) return match.clock_seconds;
  const delta = Math.floor((Date.now() - match.clock_anchor.getTime()) / 1000);
  return Math.min(HALF_LIMIT_SECONDS, match.clock_seconds + Math.max(0, delta));
}

async function syncScore(client: PoolClient, matchId: string) {
  await client.query(
    `UPDATE matches AS match
     SET home_score = (
       SELECT COUNT(*) FROM match_events AS event
       WHERE event.match_id = match.id
         AND event.kind = 'goal'
         AND event.team_id = match.home_team_id
     ),
     away_score = (
       SELECT COUNT(*) FROM match_events AS event
       WHERE event.match_id = match.id
         AND event.kind = 'goal'
         AND event.team_id = match.away_team_id
     )
     WHERE match.id = $1`,
    [matchId],
  );
}

async function insertState(client: PoolClient, state: AppState) {
  for (const team of state.teams) {
    await client.query("INSERT INTO teams (id, name, city) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [
      team.id,
      team.name,
      team.city,
    ]);
  }
  for (const player of state.players) {
    await client.query(
      `INSERT INTO players (id, team_id, name, shirt_number, position)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [player.id, player.teamId, player.name, player.number, player.position],
    );
  }
  for (const tournament of state.tournaments) {
    await client.query(
      `INSERT INTO tournaments
        (id, slug, name, city, venue, format, start_label, end_label, qualify_per_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        tournament.id,
        tournament.slug,
        tournament.name,
        tournament.city,
        tournament.venue,
        tournament.format,
        tournament.startLabel,
        tournament.endLabel,
        tournament.qualifyPerGroup,
      ],
    );
    for (const teamId of tournament.teamIds) {
      await client.query(
        `INSERT INTO tournament_teams (tournament_id, team_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [tournament.id, teamId],
      );
    }
    for (const group of tournament.groups) {
      await client.query(
        `INSERT INTO groups (id, tournament_id, name) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [group.id, tournament.id, group.name],
      );
      for (const teamId of group.teamIds) {
        await client.query(
          `INSERT INTO group_teams (group_id, team_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [group.id, teamId],
        );
      }
    }
    for (const [index, round] of tournament.knockoutRounds.entries()) {
      await client.query(
        `INSERT INTO tournament_rounds (tournament_id, round, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [tournament.id, round, index],
      );
    }
  }
  for (const match of state.matches) {
    const kickoff = kickoffDate(match.dayOffset, match.time);
    await client.query(
      `INSERT INTO matches (
        id, tournament_id, stage, group_id, round, home_team_id, away_team_id,
        home_from_match_id, away_from_match_id, home_score, away_score, status,
        kickoff_at, venue, clock_seconds, clock_running, clock_anchor,
        home_label, away_label, period, on_break
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21
      ) ON CONFLICT (id) DO NOTHING`,
      [
        match.id,
        match.tournamentId,
        match.stage,
        match.groupId ?? null,
        match.round ?? null,
        match.homeTeamId,
        match.awayTeamId,
        match.homeFromMatchId ?? null,
        match.awayFromMatchId ?? null,
        match.homeScore,
        match.awayScore,
        match.status,
        kickoff,
        match.venue,
        match.clockSeconds,
        match.clockRunning,
        match.clockAnchor,
        match.homeLabel ?? null,
        match.awayLabel ?? null,
        match.period,
        match.onBreak,
      ],
    );
  }
  for (const event of state.events) {
    await client.query(
      `INSERT INTO match_events
        (id, match_id, kind, team_id, player_id, related_player_id, card_color, minute)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.matchId,
        event.kind,
        event.teamId,
        event.playerId,
        event.relatedPlayerId ?? null,
        event.cardColor ?? null,
        event.minute,
      ],
    );
  }
  if (state.myTeamId) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ('my_team_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [state.myTeamId],
    );
  }
}

function kickoffDate(dayOffset: number, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function kickoffParts(kickoff: Date) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startKick = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate());
  const dayOffset = Math.round((startKick.getTime() - startToday.getTime()) / 86_400_000);
  const time = `${String(kickoff.getHours()).padStart(2, "0")}:${String(kickoff.getMinutes()).padStart(2, "0")}`;
  return { dayOffset, time };
}
