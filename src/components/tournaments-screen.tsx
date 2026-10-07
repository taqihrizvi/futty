"use client";

import Link from "next/link";
import { EmptyNote, PageHeader } from "@/components/ui";
import { tournamentPhase } from "@/lib/derive";
import { useApp } from "@/lib/store";

export function TournamentsScreen() {
  const { state } = useApp();

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
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.slug}`}
              className="rounded-xl bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  {tournamentPhase(state, tournament)}
                </p>
                <p className="text-sm font-semibold text-muted">{tournament.format}</p>
              </div>
              <h2 className="mt-1 text-xl font-semibold">{tournament.name}</h2>
              <p className="mt-1 text-base text-muted">
                {tournament.city} · {tournament.teamIds.length} teams ·{" "}
                {tournament.groups.length} groups
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
