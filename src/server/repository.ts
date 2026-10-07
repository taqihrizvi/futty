import { readFileSync } from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
import { publishTournament } from "@/lib/publish";
import { createSeed } from "@/lib/seed";
import type { AppState, Format, Match, MatchEvent, NewTournamentInput, Player, TournamentDetails } from "@/lib/types";
import { HALF_LIMIT_SECONDS } from "@/lib/format";
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
  const count = await getPool().query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM tournaments",
  );
  if (count.rows[0]?.count === "0") {
    await replaceState(createSeed());
  }
}

export async function loadState(): Promise<AppState> {
  await ensureReady();
  const db = getPool();
  const [teams, players, tournaments, tournamentTeams, groups, groupTeams, rounds, matches, events, settings] =
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
      }>("SELECT * FROM matches"),
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
}

export async function replaceState(state: AppState) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
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
  const match = await getMatch(event.matchId);
  if (!match || match.status !== "live") throw new Error("Match is not live");
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

export async function startMatch(matchId: string) {
  await ensureReady();
  await getPool().query(
    `UPDATE matches
     SET status = 'live',
         period = 1,
         on_break = false,
         clock_seconds = 0,
         clock_running = true,
         clock_anchor = now()
     WHERE id = $1`,
    [matchId],
  );
  return loadState();
}

export async function endMatch(matchId: string) {
  await ensureReady();
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");
  await getPool().query(
    `UPDATE matches
     SET status = 'finished',
         clock_running = false,
         clock_anchor = NULL,
         clock_seconds = $2
     WHERE id = $1`,
    [matchId, Math.min(HALF_LIMIT_SECONDS, elapsed(match))],
  );
  return loadState();
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
