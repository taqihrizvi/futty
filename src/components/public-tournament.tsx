"use client";

import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Band, Fixture, LiveScore, PublicStatus, usePublicState } from "@/components/public-widgets";
import { groupStandings, leaderboard, sortedMatches, tournamentBySlug } from "@/lib/derive";
import { formatGd, formatLabel } from "@/lib/format";

export function PublicTournament({ slug }: { slug: string }) {
  const { state, error } = usePublicState();
  const tournament = state ? tournamentBySlug(state, slug) : null;
  const matches = state && tournament ? state.matches.filter((match) => match.tournamentId === tournament.id) : [];
  const live = sortedMatches(matches.filter((match) => match.status === "live"));
  const upcoming = sortedMatches(matches.filter((match) => match.status === "scheduled")).slice(0, 6);
  const scorers = state && tournament ? leaderboard(state, tournament.id, "goals").filter((row) => row.value > 0) : [];
  const savers = state && tournament ? leaderboard(state, tournament.id, "saves").filter((row) => row.value > 0) : [];

  return (
    <PublicShell>
      <PublicStatus error={error} state={state} />
      {state && !tournament ? (
        <div>
          <h1 className="text-headline-lg">Tournament not found</h1>
          <Link href="/watch/tournaments" className="mt-3 inline-flex min-h-12 items-center text-label-lg text-primary">
            All tournaments
          </Link>
        </div>
      ) : null}
      {state && tournament ? (
        <div className="grid gap-4">
          <div className="rounded-xl bg-gradient-to-r from-primary via-primary-container to-secondary p-4 text-on-primary shadow-md">
            <p className="text-label-sm tracking-wider uppercase opacity-80">{formatLabel(tournament.format)}</p>
            <h1 className="text-headline-lg">{tournament.name}</h1>
            <p className="mt-1 text-label-md opacity-90">{[tournament.city, tournament.venue].filter(Boolean).join(" · ") || "Tournament"}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="grid gap-4 lg:col-span-8">
              <Band eyebrow="On the pitch" title="Current match" href="/watch/matches" action="All matches" tone="bg-inverse-surface">
                {live.length === 0 ? <p className="text-on-surface-variant">No match is being played right now.</p> : null}
                {live.map((match) => (
                  <LiveScore key={match.id} state={state} match={match} />
                ))}
              </Band>
              <Band eyebrow={tournament.name} title="Upcoming matches" tone="bg-primary">
                {upcoming.length === 0 ? <p className="text-on-surface-variant">Nothing left to play.</p> : null}
                {upcoming.map((match) => (
                  <Fixture key={match.id} state={state} match={match} />
                ))}
              </Band>
              <section className="grid gap-3">
                <h2 className="text-headline-md">Group ranking</h2>
                {tournament.groups.map((group, index) => (
                  <section key={group.id} className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                    <h3 className={`px-3 py-2 text-label-lg text-on-primary ${index % 2 === 0 ? "bg-secondary" : "bg-primary"}`}>{group.name}</h3>
                    <div className="grid grid-cols-12 px-3 py-2 text-label-sm text-outline uppercase">
                      <span className="col-span-6">Team</span>
                      <span className="col-span-2 text-center">P</span>
                      <span className="col-span-2 text-center">GD</span>
                      <span className="col-span-2 text-right">Pts</span>
                    </div>
                    {groupStandings(state, tournament, group.id).map((row) => (
                      <div key={row.teamId} className={`mx-2 mb-1 grid grid-cols-12 items-center rounded-lg px-2 py-2 text-body-sm ${row.rank === 1 ? "bg-secondary-fixed" : ""}`}>
                        <span className="col-span-6 flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-label-sm text-on-primary">{row.rank}</span>
                          <span className="truncate font-semibold">{state.teams.find((team) => team.id === row.teamId)?.name ?? "Team"}</span>
                        </span>
                        <span className="col-span-2 text-center">{row.played}</span>
                        <span className="col-span-2 text-center">{formatGd(row.gd)}</span>
                        <span className="col-span-2 text-right font-bold text-primary">{row.points}</span>
                      </div>
                    ))}
                    <div className="h-2" />
                  </section>
                ))}
              </section>
            </div>
            <div className="grid gap-4 lg:col-span-4">
              <Leader title="Top scorer" unit="goals" tone="bg-primary text-on-primary" name={scorers[0]?.name} team={scorers[0]?.teamName} value={scorers[0]?.value} />
              <Leader title="Top saver" unit="saves" tone="bg-success text-on-primary" name={savers[0]?.name} team={savers[0]?.teamName} value={savers[0]?.value} />
              <Link href="/watch/stats" className="flex min-h-12 items-center justify-center rounded-xl bg-warning text-label-lg text-navy">
                Full stats
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </PublicShell>
  );
}

function Leader({
  title,
  unit,
  tone,
  name,
  team,
  value,
}: {
  title: string;
  unit: string;
  tone: string;
  name?: string;
  team?: string;
  value?: number;
}) {
  return (
    <section className={`rounded-xl p-4 shadow-md ${tone}`}>
      <p className="text-label-sm tracking-wider uppercase opacity-80">{title}</p>
      {name ? (
        <>
          <p className="mt-1 text-headline-md">{name}</p>
          <p className="text-label-md opacity-90">{team}</p>
          <p className="mt-2 text-headline-xl tabular-nums">
            {value} <span className="text-label-lg">{unit}</span>
          </p>
        </>
      ) : (
        <p className="mt-2 opacity-90">No {unit} yet.</p>
      )}
    </section>
  );
}
