import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { createSeed } from "../src/lib/seed.ts";

const root = path.resolve(import.meta.dirname, "..");
const env = readFileSync(path.join(root, ".env"), "utf8");
const match = env.match(/^DATABASE_URL=(.*)$/m);
if (!match?.[1]) throw new Error("DATABASE_URL is missing from .env");

const pool = new pg.Pool({ connectionString: match[1].trim() });
const schema = readFileSync(path.join(root, "src", "server", "schema.sql"), "utf8");
await pool.query(schema);

const client = await pool.connect();
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
  const state = createSeed();
  for (const team of state.teams) {
    await client.query("INSERT INTO teams (id, name, city) VALUES ($1, $2, $3)", [
      team.id,
      team.name,
      team.city,
    ]);
  }
  for (const player of state.players) {
    await client.query(
      "INSERT INTO players (id, team_id, name, shirt_number, position) VALUES ($1, $2, $3, $4, $5)",
      [player.id, player.teamId, player.name, player.number, player.position],
    );
  }
  for (const tournament of state.tournaments) {
    await client.query(
      `INSERT INTO tournaments
        (id, slug, name, city, venue, format, start_label, end_label, qualify_per_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
        "INSERT INTO tournament_teams (tournament_id, team_id) VALUES ($1, $2)",
        [tournament.id, teamId],
      );
    }
    for (const group of tournament.groups) {
      await client.query(
        "INSERT INTO groups (id, tournament_id, name) VALUES ($1, $2, $3)",
        [group.id, tournament.id, group.name],
      );
      for (const teamId of group.teamIds) {
        await client.query("INSERT INTO group_teams (group_id, team_id) VALUES ($1, $2)", [
          group.id,
          teamId,
        ]);
      }
    }
    for (const [index, round] of tournament.knockoutRounds.entries()) {
      await client.query(
        "INSERT INTO tournament_rounds (tournament_id, round, sort_order) VALUES ($1, $2, $3)",
        [tournament.id, round, index],
      );
    }
  }
  for (const item of state.matches) {
    const [hours, minutes] = item.time.split(":").map((part) => Number(part));
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + item.dayOffset);
    kickoff.setHours(hours, minutes, 0, 0);
    await client.query(
      `INSERT INTO matches (
        id, tournament_id, stage, group_id, round, home_team_id, away_team_id,
        home_from_match_id, away_from_match_id, home_score, away_score, status,
        kickoff_at, venue, clock_seconds, clock_running, clock_anchor,
        home_label, away_label, period, on_break
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )`,
      [
        item.id,
        item.tournamentId,
        item.stage,
        item.groupId ?? null,
        item.round ?? null,
        item.homeTeamId,
        item.awayTeamId,
        item.homeFromMatchId ?? null,
        item.awayFromMatchId ?? null,
        item.homeScore,
        item.awayScore,
        item.status,
        kickoff,
        item.venue,
        item.clockSeconds,
        item.clockRunning,
        item.clockAnchor,
        item.homeLabel ?? null,
        item.awayLabel ?? null,
        item.period,
        item.onBreak,
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

const check = await pool.query<{ name: string }>("SELECT name FROM teams ORDER BY name");
const counts = await pool.query<{ players: string; matches: string }>(
  "SELECT (SELECT COUNT(*) FROM players)::text AS players, (SELECT COUNT(*) FROM matches)::text AS matches",
);
console.log(check.rows.map((row) => row.name).join(" | "));
console.log(`players ${counts.rows[0]?.players} matches ${counts.rows[0]?.matches}`);
await pool.end();
