"use client";

import Link from "next/link";
import { Bracket } from "@/components/bracket";
import { Deferred } from "@/components/deferred";
import { LeaderList } from "@/components/leaders";
import { MatchCard } from "@/components/match-card";
import { Standings } from "@/components/standings";
import { EmptyNote, PageHeader, SectionHeading } from "@/components/ui";
import {
  groupStandings,
  leaderboard,
  progressFor,
  sortedMatches,
  tournamentBySlug,
  tournamentPhase,
} from "@/lib/derive";
import { useApp } from "@/lib/store";

export function TournamentScreen({ slug }: { slug: string }) {
  const { state } = useApp();
  const tournament = tournamentBySlug(state, slug);

  if (!tournament) {
    return (
      <div>
        <PageHeader title="Tournament not found" />
        <Link href="/tournaments" className="font-semibold text-accent">
          All tournaments
        </Link>
      </div>
    );
  }

  const matches = state.matches.filter((match) => match.tournamentId === tournament.id);
  const live = matches.filter((match) => match.status === "live");
  const today = sortedMatches(
    matches.filter((match) => match.dayOffset === 0 && match.status !== "live"),
  );
  const recent = sortedMatches(matches.filter((match) => match.status === "finished"))
    .reverse()
    .slice(0, 4);
  const progress = progressFor(state, tournament.id);
  const scorers = leaderboard(state, tournament.id, "goals");
  const assists = leaderboard(state, tournament.id, "assists");
  const keepers = leaderboard(state, tournament.id, "saves");
  const awards = [
    ["Golden boot", scorers[0]],
    ["Playmaker", assists[0]],
    ["Golden glove", keepers[0]],
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow={`${tournamentPhase(state, tournament)} · ${tournament.format}`}
        title={tournament.name}
        detail={
          [tournament.city, tournament.venue].filter(Boolean).join(" · ") ||
          `${tournament.startLabel} – ${tournament.endLabel}`
        }
      />

      <section>
        <SectionHeading title="Live matches" />
        {live.length === 0 ? (
          <EmptyNote>No live matches in this tournament.</EmptyNote>
        ) : (
          <div className="grid gap-3">
            {live.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading title="Today" />
        {today.length === 0 ? (
          <EmptyNote>No other fixtures today.</EmptyNote>
        ) : (
          <div className="grid gap-3">
            {today.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading title="Tournament progress" />
        <div className="rounded-2xl bg-pitch-2 p-4">
          <p className="text-lg font-semibold">
            {progress.done} of {progress.total} matches played
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-pitch-3">
            <div className="h-3 rounded-full bg-accent" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </section>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Standings" />
          <div className="grid gap-6">
            {tournament.groups.map((group) => (
              <div key={group.id}>
                <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
                <Standings
                  rows={groupStandings(state, tournament, group.id)}
                  showTable
                />
              </div>
            ))}
          </div>
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Top scorers" href="/stats" action="All stats" />
          <LeaderList rows={scorers} metric="goals" limit={3} />
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Top assists" />
          <LeaderList rows={assists} metric="assists" limit={3} />
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Top goalkeepers" />
          <LeaderList rows={keepers} metric="saves" limit={3} />
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Recent results" />
          {recent.length === 0 ? (
            <EmptyNote>No finished matches yet.</EmptyNote>
          ) : (
            <div className="grid gap-3">
              {recent.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Bracket" />
          <Bracket tournament={tournament} />
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Awards" />
          <div className="grid gap-3">
            {awards.map(([label, row]) => (
              <article key={label} className="rounded-2xl bg-pitch-2 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-gold">{label}</p>
                <p className="mt-1 text-xl font-semibold">{row ? row.name : "Not decided"}</p>
                {row ? (
                  <p className="text-base text-muted">
                    {row.teamName} · {row.value}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Teams" href="/teams" action="Manage" />
          <div className="grid gap-3 sm:grid-cols-2">
            {tournament.teamIds.map((teamId) => {
              const team = state.teams.find((item) => item.id === teamId);
              if (!team) return null;
              const count = state.players.filter((player) => player.teamId === team.id).length;
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="rounded-2xl bg-pitch-2 p-4"
                >
                  <p className="text-lg font-semibold">{team.name}</p>
                  <p className="text-base text-muted">
                    {team.city} · {count} players
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </Deferred>

      <Deferred>
        <section className="mt-8">
          <SectionHeading title="Player statistics" href="/stats" action="View all" />
          <LeaderList
            rows={leaderboard(state, tournament.id, "performance")}
            metric="performance"
            limit={5}
          />
        </section>
      </Deferred>
    </div>
  );
}
