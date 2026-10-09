"use client";

import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { PublicStatus, usePublicState } from "@/components/public-widgets";
import { formatLabel } from "@/lib/format";

const TONES = ["bg-primary text-on-primary", "bg-secondary text-on-secondary", "bg-success text-on-primary", "bg-warning text-navy"];

export function PublicTournaments() {
  const { state, error } = usePublicState();

  return (
    <PublicShell>
      <PublicStatus error={error} state={state} />
      {state ? (
        <div className="grid gap-4">
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="bg-primary px-4 py-3 text-on-primary">
              <p className="text-label-sm tracking-wider text-primary-fixed uppercase">Contour Arena</p>
              <h1 className="text-headline-lg">Tournaments</h1>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              {state.tournaments.length === 0 ? <p className="text-on-surface-variant">No tournament is published yet.</p> : null}
              {state.tournaments.map((tournament, index) => {
                const matches = state.matches.filter((match) => match.tournamentId === tournament.id);
                const live = matches.filter((match) => match.status === "live").length;
                return (
                  <Link key={tournament.id} href={`/watch/${tournament.slug}`} className={`rounded-xl p-4 shadow-md ${TONES[index % TONES.length]}`}>
                    <span className="text-label-sm uppercase opacity-80">{formatLabel(tournament.format)}</span>
                    <span className="mt-1 block text-headline-md">{tournament.name}</span>
                    <span className="mt-1 block text-label-md opacity-90">
                      {live > 0 ? `${live} live now` : `${matches.filter((match) => match.status === "scheduled").length} upcoming`}
                      {tournament.city ? ` · ${tournament.city}` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </PublicShell>
  );
}
