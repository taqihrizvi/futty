"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
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
import { formatLabel } from "@/lib/format";
import { teamKey } from "@/lib/publish";
import { useApp } from "@/lib/store";
import type { Group, Team } from "@/lib/types";
import { TournamentEditor } from "@/components/tournament-editor";

export function TournamentScreen({ slug }: { slug: string }) {
  const { state, addTeamToTournament, removeTournament } = useApp();
  const router = useRouter();
  const tournament = tournamentBySlug(state, slug);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);

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
        eyebrow={`${tournamentPhase(state, tournament)} · ${formatLabel(tournament.format)}`}
        title={tournament.name}
        detail={
          [tournament.city, tournament.venue].filter(Boolean).join(" · ") ||
          `${tournament.startLabel} – ${tournament.endLabel}`
        }
      />
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mb-6 min-h-12 rounded-2xl bg-primary px-4 text-label-lg font-semibold text-on-primary"
      >
        Edit tournament
      </button>

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
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-headline-md text-on-surface">Teams</h2>
            <button type="button" onClick={() => setAddingTeam(true)} className="text-label-md text-primary">
              Add team
            </button>
          </div>
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
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="mt-8 min-h-14 w-full rounded-2xl bg-error px-4 text-lg font-semibold text-on-primary"
      >
        Delete tournament
      </button>
      {addingTeam ? (
        <AddTournamentTeam
          tournamentId={tournament.id}
          groupIds={tournament.groups}
          taken={new Set(tournament.teamIds)}
          teams={state.teams}
          onAdd={(input) => {
            addTeamToTournament({ tournamentId: tournament.id, ...input });
            setAddingTeam(false);
          }}
          onClose={() => setAddingTeam(false)}
        />
      ) : null}
      {confirmDelete ? (
        <BottomSheet title="Delete tournament" onClose={() => setConfirmDelete(false)}>
          <p className="text-base text-on-surface-variant">
            Delete {tournament.name}? This removes its matches, groups, and standings. Squads stay in Teams.
          </p>
          <button
            type="button"
            onClick={() => {
              removeTournament(tournament.id);
              router.push("/tournaments");
            }}
            className="mt-4 min-h-14 w-full rounded-2xl bg-error px-4 text-lg font-semibold text-on-primary"
          >
            Delete tournament
          </button>
        </BottomSheet>
      ) : null}
      {editing ? <TournamentEditor tournament={tournament} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

function AddTournamentTeam({
  groupIds,
  taken,
  teams,
  onAdd,
  onClose,
}: {
  tournamentId: string;
  groupIds: Group[];
  taken: Set<string>;
  teams: Team[];
  onAdd: (input: { teamId?: string; name?: string; city?: string; groupId?: string }) => void;
  onClose: () => void;
}) {
  const available = teams.filter((team) => !taken.has(team.id));
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [groupId, setGroupId] = useState(groupIds[0]?.id ?? "");
  const [error, setError] = useState("");

  return (
    <BottomSheet title="Add team" onClose={onClose}>
      <form
        className="grid max-h-[70vh] gap-3 overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault();
          const group = groupId || undefined;
          if (teamId) {
            onAdd({ teamId, groupId: group });
            return;
          }
          const nextName = name.trim().replace(/\s+/g, " ");
          if (!nextName) {
            setError("Choose a team or enter a name.");
            return;
          }
          if (teams.some((team) => taken.has(team.id) && teamKey(team.name) === teamKey(nextName))) {
            setError("That team is already in this tournament.");
            return;
          }
          onAdd({ name: nextName, city: city.trim(), groupId: group });
        }}
      >
        {available.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-base font-semibold">Existing teams</p>
            {available.map((team) => (
              <button
                key={team.id}
                type="button"
                aria-pressed={teamId === team.id}
                onClick={() => {
                  setTeamId((current) => (current === team.id ? "" : team.id));
                  setName("");
                  setError("");
                }}
                className={
                  teamId === team.id
                    ? "min-h-14 rounded-2xl bg-accent px-4 text-left text-lg font-semibold text-accent-ink"
                    : "min-h-14 rounded-2xl bg-pitch-2 px-4 text-left text-lg font-semibold"
                }
              >
                {team.name}
                {team.city ? <span className="block text-sm font-normal opacity-80">{team.city}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        <p className="text-base font-semibold">New team</p>
        <label className="grid gap-1 text-base font-semibold">
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setTeamId("");
            }}
            className="min-h-12 rounded-2xl bg-pitch-2 px-4 text-base font-normal"
          />
        </label>
        <label className="grid gap-1 text-base font-semibold">
          City
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="min-h-12 rounded-2xl bg-pitch-2 px-4 text-base font-normal"
          />
        </label>
        {groupIds.length > 1 ? (
          <div className="grid gap-2">
            <p className="text-base font-semibold">Group</p>
            <div className="grid grid-cols-2 gap-2">
              {groupIds.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupId(group.id)}
                  className={
                    groupId === group.id
                      ? "min-h-12 rounded-2xl bg-accent px-3 text-base font-semibold text-accent-ink"
                      : "min-h-12 rounded-2xl bg-pitch-2 px-3 text-base font-semibold"
                  }
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="text-base font-semibold text-error">{error}</p> : null}
        <button type="submit" className="min-h-14 rounded-2xl bg-primary px-4 text-lg font-semibold text-on-primary">
          Add team
        </button>
      </form>
    </BottomSheet>
  );
}
