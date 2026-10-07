"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { EmptyNote, PageHeader } from "@/components/ui";
import { TournamentEditor } from "@/components/tournament-editor";
import { tournamentPhase } from "@/lib/derive";
import { formatLabel } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Tournament } from "@/lib/types";

export function TournamentsScreen() {
  const { state, removeTournament } = useApp();
  const [pending, setPending] = useState<Tournament | null>(null);
  const [editing, setEditing] = useState<Tournament | null>(null);

  return (
    <div>
      <PageHeader
        title="Tournaments"
        detail="Open a tournament for live scores, standings, and the bracket."
      />
      <Link
        href="/tournaments/new"
        className="mb-4 flex min-h-14 items-center justify-center rounded-xl bg-primary px-4 text-label-lg text-on-primary"
      >
        Create tournament
      </Link>
      {state.tournaments.length === 0 ? (
        <EmptyNote>No tournaments yet.</EmptyNote>
      ) : (
        <div className="grid gap-3">
          {state.tournaments.map((tournament) => (
            <article
              key={tournament.id}
              className="flex items-stretch gap-2 rounded-xl bg-surface-container-lowest p-4 shadow-sm"
            >
              <Link href={`/tournaments/${tournament.slug}`} className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                    {tournamentPhase(state, tournament)}
                  </p>
                  <p className="text-sm font-semibold text-muted">{formatLabel(tournament.format)}</p>
                </div>
                <h2 className="mt-1 text-xl font-semibold">{tournament.name}</h2>
                <p className="mt-1 text-base text-muted">
                  {tournament.city} · {tournament.teamIds.length} teams · {tournament.groups.length} groups
                </p>
              </Link>
              <div className="flex shrink-0 flex-col justify-center">
                <button
                  type="button"
                  onClick={() => setEditing(tournament)}
                  className="rounded-xl px-3 py-2 text-label-md font-semibold text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPending(tournament)}
                  className="rounded-xl px-3 py-2 text-label-md font-semibold text-error"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing ? <TournamentEditor tournament={editing} onClose={() => setEditing(null)} /> : null}
      {pending ? (
        <BottomSheet title="Delete tournament" onClose={() => setPending(null)}>
          <p className="text-base text-on-surface-variant">
            Delete {pending.name}? This removes its matches, groups, and standings. Squads stay in Teams.
          </p>
          <button
            type="button"
            onClick={() => {
              removeTournament(pending.id);
              setPending(null);
            }}
            className="mt-4 min-h-14 w-full rounded-2xl bg-error px-4 text-lg font-semibold text-on-primary"
          >
            Delete tournament
          </button>
        </BottomSheet>
      ) : null}
    </div>
  );
}
