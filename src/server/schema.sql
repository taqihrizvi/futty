CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  name text NOT NULL,
  shirt_number integer NOT NULL,
  position text
);

CREATE TABLE IF NOT EXISTS tournaments (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  venue text NOT NULL,
  format text NOT NULL CHECK (format IN ('5v5', '6v6', '7v7', '11v11')),
  start_label text NOT NULL,
  end_label text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  qualify_per_group integer NOT NULL CHECK (qualify_per_group > 0)
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  tournament_id text NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS group_teams (
  group_id text NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  tournament_id text NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  round text NOT NULL CHECK (round IN ('quarter-final', 'semi-final', 'final')),
  sort_order integer NOT NULL,
  PRIMARY KEY (tournament_id, round)
);

CREATE TABLE IF NOT EXISTS matches (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('group', 'knockout')),
  group_id text REFERENCES groups (id) ON DELETE SET NULL,
  round text CHECK (round IN ('quarter-final', 'semi-final', 'final')),
  home_team_id text REFERENCES teams (id),
  away_team_id text REFERENCES teams (id),
  home_from_match_id text REFERENCES matches (id) DEFERRABLE INITIALLY DEFERRED,
  away_from_match_id text REFERENCES matches (id) DEFERRABLE INITIALLY DEFERRED,
  home_score integer NOT NULL DEFAULT 0,
  away_score integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('scheduled', 'live', 'finished')),
  kickoff_at timestamptz NOT NULL,
  venue text NOT NULL,
  clock_seconds integer NOT NULL DEFAULT 0,
  clock_running boolean NOT NULL DEFAULT false,
  clock_anchor timestamptz,
  home_label text,
  away_label text,
  period integer NOT NULL DEFAULT 1,
  on_break boolean NOT NULL DEFAULT false
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_label text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_label text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS period integer NOT NULL DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS on_break boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS match_events (
  id text PRIMARY KEY,
  match_id text NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('goal', 'assist', 'save', 'card', 'substitution')),
  team_id text NOT NULL,
  player_id text NOT NULL,
  related_player_id text,
  card_color text CHECK (card_color IN ('yellow', 'red')),
  minute integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE players ALTER COLUMN position DROP NOT NULL;

ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('5v5', '6v6', '7v7', '11v11'));

CREATE INDEX IF NOT EXISTS matches_tournament_idx ON matches (tournament_id, kickoff_at);
CREATE INDEX IF NOT EXISTS match_events_match_idx ON match_events (match_id, created_at);
