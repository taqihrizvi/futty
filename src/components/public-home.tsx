"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/components/public-shell";
import { Band, Fixture, KpiLink, LiveScore, PublicStatus, usePublicState } from "@/components/public-widgets";
import { groupStandings, leaderboard, sortedMatches } from "@/lib/derive";
import { formatGd, formatLabel } from "@/lib/format";

export function PublicHome() {
  const { state, error } = usePublicState();
  const [cupId, setCupId] = useState<string | null>(null);
  const tournament = state?.tournaments.find((item) => item.id === cupId) ?? state?.tournaments[0];
  const matches = state && tournament ? state.matches.filter((match) => match.tournamentId === tournament.id) : [];
  const live = matches.filter((match) => match.status === "live");
  const today = sortedMatches(matches.filter((match) => match.dayOffset === 0));
  const upcomingToday = today.filter((match) => match.status === "scheduled").length;
  const upcoming = sortedMatches(matches.filter((match) => match.status === "scheduled"));
  const matchIds = new Set(matches.map((match) => match.id));
  const goals = state ? state.events.filter((event) => event.kind === "goal" && matchIds.has(event.matchId)).length : 0;
  const finished = matches.filter((match) => match.status === "finished").length;
  const average = finished > 0 ? (goals / finished).toFixed(2) : "0.00";
  const roster = state && tournament ? state.players.filter((player) => tournament.teamIds.includes(player.teamId)).length : 0;
  const scorers = tournament && state ? leaderboard(state, tournament.id, "goals").filter((row) => row.value > 0) : [];
  const savers = tournament && state ? leaderboard(state, tournament.id, "saves").filter((row) => row.value > 0) : [];

  return (
    <PublicShell>
      <PublicStatus error={error} state={state} />
      {state && tournament ? (
        <div className="grid gap-4">
          <div className="rounded-xl bg-gradient-to-r from-primary via-primary-container to-secondary p-3 shadow-md">
            <p className="mb-2 text-label-sm tracking-wider text-primary-fixed uppercase">Tournament</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {state.tournaments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === tournament.id}
                  onClick={() => setCupId(item.id)}
                  className={`min-h-11 shrink-0 rounded-lg px-3 text-label-md ${item.id === tournament.id ? "bg-white text-primary" : "bg-white/15 text-on-primary"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiLink href={`/watch/${tournament.slug}`} label="Teams" value={String(tournament.teamIds.length)} note={`${formatLabel(tournament.format)} · ${tournament.city || "Cup"}`} icon="emoji_events" cardClass="bg-primary text-on-primary" />
            <KpiLink href="/watch/matches" label="Matches today" value={String(today.length)} note={`${live.length} live, ${upcomingToday} still to play`} icon="sports_soccer" cardClass="bg-secondary text-on-secondary" />
            <KpiLink href="/watch/stats" label="Goals" value={String(goals)} note={`${average} per finished match`} icon="scoreboard" cardClass="bg-success text-on-primary" />
            <KpiLink href={`/watch/${tournament.slug}`} label="Players" value={String(roster)} note={`${tournament.teamIds.length} squads in this cup`} icon="badge" cardClass="bg-warning text-navy" />
          </div>

          {live[0] ? <LiveScore state={state} match={live[0]} /> : null}

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Band eyebrow={tournament.name} title="Upcoming fixtures" href="/watch/matches" action="All matches">
                {upcoming.length === 0 ? <p className="text-on-surface-variant">Nothing left to play.</p> : null}
                {upcoming.map((match) => (
                  <Fixture key={match.id} state={state} match={match} />
                ))}
              </Band>
            </div>
            <div className="grid gap-4 lg:col-span-4">
              <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
                <h2 className="text-headline-md">Top performers</h2>
                <Performer label="Top scorer" unit="goals" row={scorers[0]} tone="bg-primary-fixed" />
                <Performer label="Top saver" unit="saves" row={savers[0]} tone="bg-success/15" />
                <Link href="/watch/stats" className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-surface-container-low text-label-md">
                  Open stats
                </Link>
              </section>
              {tournament.groups[0] ? (
                <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ring-2 ring-secondary/40">
                  <div className="bg-secondary px-3 py-2 text-on-secondary">
                    <h2 className="text-headline-md">{tournament.groups[0].name}</h2>
                  </div>
                  {groupStandings(state, tournament, tournament.groups[0].id).slice(0, 4).map((row) => (
                    <div key={row.teamId} className={`mx-2 my-1 grid grid-cols-12 items-center rounded-lg px-2 py-2 text-body-sm ${row.rank === 1 ? "bg-secondary-fixed" : ""}`}>
                      <span className="col-span-8 truncate font-semibold">
                        {row.rank}. {state.teams.find((team) => team.id === row.teamId)?.name ?? "Team"}
                      </span>
                      <span className="col-span-2 text-center">{formatGd(row.gd)}</span>
                      <span className="col-span-2 text-right font-bold text-primary">{row.points}</span>
                    </div>
                  ))}
                  <Link href={`/watch/${tournament.slug}`} className="block px-3 py-3 text-label-md text-primary">
                    Full table
                  </Link>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {state && state.tournaments.length === 0 ? <p className="text-on-surface-variant">No tournament is published yet.</p> : null}
    </PublicShell>
  );
}

function Performer({
  label,
  unit,
  row,
  tone,
}: {
  label: string;
  unit: string;
  row?: { name: string; teamName: string; value: number };
  tone: string;
}) {
  if (!row) return <p className="mt-3 text-on-surface-variant">No {unit} yet.</p>;
  return (
    <div className={`mt-3 rounded-xl p-3 ${tone}`}>
      <p className="text-label-sm font-bold tracking-wider text-secondary uppercase">{label}</p>
      <p className="text-headline-md">{row.name}</p>
      <p className="text-body-sm text-on-surface-variant">{row.teamName}</p>
      <p className="text-score-display text-primary">
        {row.value} <span className="text-label-sm">{unit}</span>
      </p>
    </div>
  );
}
