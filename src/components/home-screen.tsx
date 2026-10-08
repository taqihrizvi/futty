"use client";

import Link from "next/link";
import { Icon, initials } from "@/components/icon";
import { Chip } from "@/components/ui";
import {
  groupStandings,
  leaderboard,
  matchLabel,
  playerById,
  sideTeam,
  sortedMatches,
  teamById,
} from "@/lib/derive";
import { elapsedSeconds, formatGd, formatLabel, periodClock } from "@/lib/format";
import { setCupId, useCupId } from "@/lib/cup";
import { useNow } from "@/components/deferred";
import { useApp } from "@/lib/store";
import type { Match, MatchEvent } from "@/lib/types";

export function HomeScreen() {
  const { state } = useApp();
  const cupId = useCupId();
  const tournament = state.tournaments.find((item) => item.id === cupId) ?? state.tournaments[0];
  const cupMatches = tournament
    ? state.matches.filter((match) => match.tournamentId === tournament.id)
    : [];
  const cupMatchIds = new Set(cupMatches.map((match) => match.id));
  const today = sortedMatches(cupMatches.filter((match) => match.dayOffset === 0));
  const live = cupMatches.filter((match) => match.status === "live");
  const scheduledToday = today.filter((match) => match.status === "scheduled").length;
  const goals = state.events.filter((event) => event.kind === "goal" && cupMatchIds.has(event.matchId)).length;
  const finished = cupMatches.filter((match) => match.status === "finished").length;
  const average = finished > 0 ? (goals / finished).toFixed(2) : "0.00";
  const roster = tournament
    ? state.players.filter((player) => tournament.teamIds.includes(player.teamId)).length
    : 0;
  const hero = live[0] ?? null;
  const scorers = tournament ? leaderboard(state, tournament.id, "goals") : [];
  const assisters = tournament ? leaderboard(state, tournament.id, "assists") : [];
  const gloves = tournament ? leaderboard(state, tournament.id, "cleanSheets") : [];
  const alerts = state.events.filter((event) => cupMatchIds.has(event.matchId)).slice(-4).reverse();

  return (
    <div>
      <div className="mb-4 rounded-xl bg-gradient-to-r from-primary via-primary-container to-secondary p-3 shadow-md">
        <p className="mb-2 text-label-sm tracking-wider text-primary-fixed uppercase">Tournament</p>
        {state.tournaments.length === 0 ? (
          <p className="text-on-primary">No tournament yet.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {state.tournaments.map((item) => (
              <Chip
                key={item.id}
                active={item.id === tournament?.id}
                tone="bg-white text-primary"
                className="ring-2 ring-white/70"
                onClick={() => setCupId(item.id)}
              >
                {item.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mb-space-lg grid grid-cols-2 gap-space-md xl:grid-cols-4">
        <Kpi
          label="Teams"
          value={String(tournament?.teamIds.length ?? 0)}
          note={tournament ? `${formatLabel(tournament.format)} · ${tournament.city || "Cup"}` : "No cup"}
          icon="emoji_events"
          cardClass="bg-primary text-on-primary"
        />
        <Kpi
          label="Matches today"
          value={String(today.length)}
          note={`${live.length} live, ${scheduledToday} still to play`}
          icon="sports_soccer"
          cardClass="bg-secondary text-on-secondary"
        />
        <Kpi
          label="Goals"
          value={String(goals)}
          note={`${average} per finished match`}
          icon="scoreboard"
          cardClass="bg-success text-on-primary"
        />
        <Kpi
          label="Players"
          value={String(roster)}
          note={`${tournament?.teamIds.length ?? 0} squads in this cup`}
          icon="badge"
          cardClass="bg-warning text-navy"
        />
      </div>

      {hero ? <Hero match={hero} /> : null}

      <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-12">
        <div className="flex flex-col gap-space-lg lg:col-span-8">
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col justify-between gap-space-sm bg-primary px-4 py-3 text-on-primary sm:flex-row sm:items-center">
              <div>
                <span className="text-label-sm tracking-wider text-primary-fixed uppercase">
                  {tournament?.name ?? "Matchday"}
                </span>
                <h2 className="text-headline-lg">Today&apos;s Fixtures</h2>
              </div>
              <Link href="/matches" className="text-label-md text-primary-fixed">
                All matches
              </Link>
            </div>
            <div className="flex flex-col gap-space-sm p-3 sm:p-4">
              {today.length === 0 ? (
                <p className="text-on-surface-variant">Nothing else is scheduled today.</p>
              ) : (
                today.slice(0, 6).map((match) => <FixtureRow key={match.id} match={match} />)
              )}
            </div>
          </section>

          {tournament ? (
            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
              {tournament.groups.slice(0, 2).map((group, index) => (
                <section key={group.id} className={`overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ${index === 0 ? "ring-2 ring-secondary/40" : "ring-2 ring-primary/30"}`}>
                  <div className={`mb-space-sm flex items-center justify-between px-3 py-2 text-on-primary ${index === 0 ? "bg-secondary" : "bg-primary"}`}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                      <h3 className="text-headline-md">{group.name} Leaders</h3>
                    </div>
                    <Link
                      href={`/tournaments/${tournament.slug}`}
                      className="flex items-center gap-0.5 text-label-sm font-semibold text-primary-fixed"
                    >
                      Full Table <Icon name="arrow_forward" className="text-[14px]" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-12 px-3 py-1.5 text-label-sm tracking-wider text-outline uppercase">
                    <span className="col-span-6">Team</span>
                    <span className="col-span-2 text-center">P</span>
                    <span className="col-span-2 text-center">GD</span>
                    <span className="col-span-2 text-right">Pts</span>
                  </div>
                  {groupStandings(state, tournament, group.id)
                    .slice(0, 3)
                    .map((row) => {
                      const team = teamById(state, row.teamId);
                      const lead = row.rank === 1;
                      return (
                        <div
                          key={row.teamId}
                          className={`mx-2 my-0.5 grid grid-cols-12 items-center rounded-lg px-2 py-2.5 text-body-sm ${lead ? "bg-secondary-fixed" : ""}`}
                        >
                          <div className="col-span-6 flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-label-sm font-bold ${lead ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-on-surface-variant"}`}
                            >
                              {row.rank}
                            </span>
                            <span className="truncate font-semibold text-on-surface">{team?.name ?? "Team"}</span>
                            {row.qualification === "Qualified" ? (
                              <Icon name="check_circle" className="shrink-0 text-[14px] text-primary" />
                            ) : null}
                          </div>
                          <span className="col-span-2 text-center text-on-surface-variant">{row.played}</span>
                          <span className="col-span-2 text-center font-semibold text-on-surface">
                            {formatGd(row.gd)}
                          </span>
                          <span className="col-span-2 text-right text-label-md font-bold text-primary">
                            {row.points}
                          </span>
                        </div>
                      );
                    })}
                  <div className="h-2" />
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between">
              <div>
                <span className="text-label-sm tracking-wider text-outline uppercase">
                  Tournament Leaders
                </span>
                <h3 className="text-headline-md text-on-surface">Top Performers</h3>
              </div>
              <Icon name="workspace_premium" className="text-[24px] text-secondary" />
            </div>
            <div className="flex flex-col gap-space-md">
              <Performer label="Golden Boot" unit="Goals" tone="text-primary" cardClass="bg-primary-fixed" row={scorers[0]} />
              <Performer label="Playmaker" unit="Assists" tone="text-secondary" cardClass="bg-secondary-fixed" row={assisters[0]} />
              <Performer label="Golden Glove" unit="Clean Sheets" tone="text-success" cardClass="bg-success/15" row={gloves[0]} />
            </div>
            <Link
              href="/stats"
              className="mt-space-md flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container-low py-2.5 text-label-md font-semibold text-on-surface"
            >
              View Individual Metric Rankings
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between">
              <div>
                <span className="text-label-sm tracking-wider text-outline uppercase">
                  Operational Stream
                </span>
                <h3 className="text-headline-md text-on-surface">Referee & Match Alerts</h3>
              </div>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            </div>
            <div className="flex flex-col gap-space-sm">
              {alerts.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No incidents logged yet.</p>
              ) : (
                alerts.map((event) => <Alert key={event.id} event={event} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  icon,
  cardClass,
}: {
  label: string;
  value: string;
  note: string;
  icon: string;
  cardClass: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl p-3 shadow-md sm:p-4 ${cardClass}`}>
      <div className="flex min-w-0 flex-col">
        <span className="text-label-sm tracking-wider uppercase opacity-80">{label}</span>
        <span className="mt-1 text-headline-lg sm:text-headline-xl">{value}</span>
        <span className="mt-1 line-clamp-2 text-label-sm opacity-90">{note}</span>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:h-12 sm:w-12">
        <Icon name={icon} className="text-[22px]" />
      </div>
    </div>
  );
}

function Hero({ match }: { match: Match }) {
  const { state } = useApp();
  const now = useNow(match.clockRunning);
  const home = sideTeam(state, match, "home");
  const away = sideTeam(state, match, "away");
  const clock = periodClock(elapsedSeconds(match, now));
  const latest = state.events.filter((event) => event.matchId === match.id).at(-1);
  const player = latest ? playerById(state, latest.playerId) : null;

  return (
    <div className="relative mb-space-lg overflow-hidden rounded-xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-md">
      <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-primary-container/20 blur-3xl" />
      <div className="relative z-10 flex flex-col justify-between gap-space-lg lg:flex-row lg:items-center">
        <div className="flex max-w-2xl flex-col gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-label-sm font-bold tracking-wider text-on-primary-fixed uppercase">
              <span className="h-2 w-2 animate-ping rounded-full bg-error" />
              Live · {clock}
            </span>
            <span className="flex items-center gap-1 text-label-sm tracking-widest text-surface-container-high uppercase">
              <Icon name="stadium" className="text-[14px]" /> {match.venue}
            </span>
            <span className="rounded bg-surface-container-highest/20 px-2 py-0.5 text-label-sm text-surface-container-highest uppercase">
              {matchLabel(state, match)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-1 items-center gap-space-sm md:grid-cols-7">
            <div className="flex items-center gap-space-md md:col-span-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-headline-md font-bold text-primary shadow-sm">
                {initials(home.name)}
              </div>
              <span className="truncate text-headline-lg text-inverse-on-surface">{home.name}</span>
            </div>
            <div className="flex items-center justify-center md:col-span-1">
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-highest/20 px-4 py-1.5">
                <span className="text-score-display text-inverse-on-surface">{match.homeScore}</span>
                <span className="text-headline-md text-surface-dim">-</span>
                <span className="text-score-display text-inverse-on-surface">{match.awayScore}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-space-md md:col-span-3">
              <span className="truncate text-right text-headline-lg text-inverse-on-surface">{away.name}</span>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-headline-md font-bold text-secondary shadow-sm">
                {initials(away.name)}
              </div>
            </div>
          </div>
          {latest && player ? (
            <div className="flex items-center gap-2 pt-1 text-body-sm text-surface-container-highest">
              <Icon name="sports_soccer" className="text-[16px] text-primary-fixed" />
              <span>
                {latest.minute}&apos; {latest.kind} by{" "}
                <strong className="text-inverse-on-surface">{player.name}</strong>
              </span>
            </div>
          ) : null}
        </div>
        <Link
          href={`/matches/${match.id}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-space-lg py-3 text-label-lg text-on-primary shadow-sm"
        >
          <Icon name="tablet" className="text-[20px]" />
          Launch Sideline Center
        </Link>
      </div>
    </div>
  );
}

function FixtureRow({ match }: { match: Match }) {
  const { state } = useApp();
  const now = useNow(match.status === "live" && match.clockRunning);
  const home = sideTeam(state, match, "home");
  const away = sideTeam(state, match, "away");
  const live = match.status === "live";
  const finished = match.status === "finished";
  const clock = live ? periodClock(elapsedSeconds(match, now)) : match.time;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`flex flex-col justify-between gap-space-md rounded-xl border-l-4 p-space-md sm:flex-row sm:items-center ${live ? "border-error bg-error-container/40 shadow-sm" : finished ? "border-success bg-success/10" : "border-secondary bg-secondary-fixed/60"}`}
    >
      <div className="flex min-w-0 items-center gap-space-md">
        <div
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg ${live ? "bg-primary-fixed" : "bg-surface-container-lowest shadow-sm"}`}
        >
          <span className={`text-label-sm font-semibold uppercase ${live ? "text-on-primary-fixed" : "text-outline"}`}>
            {finished ? "FT" : live ? clock : ""}
          </span>
          <span className={`text-label-sm font-semibold ${live ? "text-primary" : "text-on-surface"}`}>
            {finished || !live ? match.time : "Live"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm text-outline">
            {match.venue} · {matchLabel(state, match)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-on-surface">{home.name}</span>
            <span className="shrink-0 tabular-nums font-bold">{finished || live ? match.homeScore : ""}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-on-surface">{away.name}</span>
            <span className="shrink-0 tabular-nums font-bold">{finished || live ? match.awayScore : "vs"}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-space-sm sm:justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-label-sm font-semibold uppercase ${live ? "bg-error text-on-primary" : finished ? "bg-success text-on-primary" : "bg-secondary text-on-secondary"}`}
        >
          {live ? "In play" : finished ? "Final Result" : "Scheduled"}
        </span>
        <Icon name="chevron_right" className="text-[18px] text-outline" />
      </div>
    </Link>
  );
}

function Performer({
  label,
  unit,
  tone,
  cardClass,
  row,
}: {
  label: string;
  unit: string;
  tone: string;
  cardClass: string;
  row?: { playerId: string; name: string; teamName: string; value: number };
}) {
  if (!row) return null;
  return (
    <Link href={`/players/${row.playerId}`} className={`flex items-center gap-space-md rounded-xl p-space-md ${cardClass}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-label-lg text-on-primary">
        {initials(row.name, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-label-sm font-bold tracking-wider text-secondary uppercase">{label}</span>
        <span className="block truncate text-headline-md text-on-surface">{row.name}</span>
        <span className="block text-body-sm text-on-surface-variant">{row.teamName}</span>
      </div>
      <div className="shrink-0 text-right">
        <span className={`block text-score-display leading-none ${tone}`}>{row.value}</span>
        <span className="text-label-sm font-semibold text-outline uppercase">{unit}</span>
      </div>
    </Link>
  );
}

function Alert({ event }: { event: MatchEvent }) {
  const { state } = useApp();
  const player = playerById(state, event.playerId);
  const team = teamById(state, event.teamId);
  const icon =
    event.kind === "card" ? "warning" : event.kind === "goal" ? "sports_soccer" : "assignment_turned_in";
  const box =
    event.kind === "card"
      ? "bg-error-container text-on-error-container"
      : event.kind === "goal"
        ? "bg-secondary-fixed text-on-secondary-fixed"
        : "bg-surface-container text-primary";

  return (
    <div className="flex items-start gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${box}`}>
        <Icon name={icon} className="text-[18px]" />
      </div>
      <div className="min-w-0">
        <span className="text-label-sm font-bold tracking-wider text-primary uppercase">
          {event.kind} · {event.minute}&apos;
        </span>
        <p className="mt-0.5 text-body-sm text-on-surface">
          {player?.name ?? "Player"}
          {team ? ` (${team.name})` : ""}
        </p>
      </div>
    </div>
  );
}
