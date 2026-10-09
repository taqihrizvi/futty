"use client";

import { useState } from "react";
import { PublicShell } from "@/components/public-shell";
import { Band, Fixture, KpiLink, LiveScore, PublicStatus, usePublicState } from "@/components/public-widgets";
import { sortedMatches } from "@/lib/derive";

export function PublicMatches() {
  const { state, error } = usePublicState();
  const [cupId, setCupId] = useState<string | null>(null);
  const tournament = state?.tournaments.find((item) => item.id === cupId) ?? state?.tournaments[0];
  const matches = state && tournament ? sortedMatches(state.matches.filter((match) => match.tournamentId === tournament.id)) : [];
  const live = matches.filter((match) => match.status === "live");
  const upcoming = matches.filter((match) => match.status === "scheduled");
  const played = [...matches.filter((match) => match.status === "finished")].reverse();

  return (
    <PublicShell>
      <PublicStatus error={error} state={state} />
      {state && tournament ? (
        <div className="grid gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {state.tournaments.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === tournament.id}
                onClick={() => setCupId(item.id)}
                className={`min-h-11 shrink-0 rounded-lg px-3 text-label-md ${item.id === tournament.id ? "bg-primary text-on-primary" : "bg-primary-fixed text-on-primary-fixed"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KpiLink href="#current" label="Live" value={String(live.length)} note="On the pitch" icon="sports" cardClass="bg-error text-on-primary" />
            <KpiLink href="#upcoming" label="Upcoming" value={String(upcoming.length)} note="Still to play" icon="schedule" cardClass="bg-secondary text-on-secondary" />
            <KpiLink href="#results" label="Played" value={String(played.length)} note="Full time" icon="flag" cardClass="bg-success text-on-primary" />
          </div>
          <div id="current">
            <Band eyebrow={tournament.name} title="Current match" tone="bg-inverse-surface">
              {live.length === 0 ? <p className="text-on-surface-variant">No match is being played right now.</p> : null}
              {live.map((match) => (
                <LiveScore key={match.id} state={state} match={match} />
              ))}
            </Band>
          </div>
          <div id="upcoming">
            <Band eyebrow="Fixtures" title="Upcoming matches" tone="bg-primary">
              {upcoming.length === 0 ? <p className="text-on-surface-variant">Nothing left to play.</p> : null}
              {upcoming.map((match) => (
                <Fixture key={match.id} state={state} match={match} />
              ))}
            </Band>
          </div>
          <div id="results">
            <Band eyebrow="Scoreboard" title="Results" tone="bg-success">
              {played.length === 0 ? <p className="text-on-surface-variant">No finished matches yet.</p> : null}
              {played.slice(0, 12).map((match) => (
                <Fixture key={match.id} state={state} match={match} />
              ))}
            </Band>
          </div>
        </div>
      ) : null}
    </PublicShell>
  );
}
