export type Format = "5v5" | "6v6" | "7v7" | "11v11";

export type MatchStatus = "scheduled" | "live" | "finished";

export type Stage = "group" | "knockout";

export type RoundId = "quarter-final" | "semi-final" | "final";

export type EventKind = "goal" | "assist" | "save" | "card" | "substitution";

export type CardColor = "yellow" | "red";

export type Qualification = "Qualified" | "In the spots";

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: string | null;
}

export interface Team {
  id: string;
  name: string;
  city: string;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  city: string;
  venue: string;
  format: Format;
  startLabel: string;
  endLabel: string;
  qualifyPerGroup: number;
  teamIds: string[];
  groups: Group[];
  knockoutRounds: RoundId[];
}

export interface Match {
  id: string;
  tournamentId: string;
  stage: Stage;
  groupId?: string;
  round?: RoundId;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeFromMatchId?: string;
  awayFromMatchId?: string;
  homeLabel?: string;
  awayLabel?: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  dayOffset: number;
  time: string;
  venue: string;
  clockSeconds: number;
  clockRunning: boolean;
  clockAnchor: string | null;
  period: 1 | 2;
  onBreak: boolean;
  penaltyWinnerId?: string | null;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  kind: EventKind;
  teamId: string;
  playerId: string;
  relatedPlayerId?: string;
  cardColor?: CardColor;
  minute: number;
}

export interface AppState {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  myTeamId: string | null;
}

export interface NewTournamentInput {
  name: string;
  city: string;
  venue: string;
  startDate: string;
  endDate: string;
  format: Format;
  teams: { name: string; city: string }[];
  groupCount: number;
  qualifyPerGroup: number;
  rounds: RoundId[];
}

export interface TournamentDetails {
  name: string;
  city: string;
  venue: string;
  format: Format;
  startLabel: string;
  endLabel: string;
}

export type Metric =
  | "goals"
  | "assists"
  | "saves"
  | "cleanSheets"
  | "cards"
  | "rating"
  | "performance";

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  rank: number;
  qualification: Qualification | null;
}

export interface LeaderRow {
  playerId: string;
  name: string;
  teamName: string;
  value: number;
  detail: string;
}
