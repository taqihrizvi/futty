"use client";

import { useState } from "react";
import { PublicShell } from "@/components/public-shell";
import { PublicStatus, usePublicState } from "@/components/public-widgets";
import { leaderboard } from "@/lib/derive";
import type { Metric } from "@/lib/types";

const METRICS: { id: Metric; label: string; unit: string; tone: string }[] = [
  { id: "goals", label: "Scorers", unit: "goals", tone: "bg-primary-fixed text-on-primary-fixed" },
  { id: "assists", label: "Assists", unit: "assists", tone: "bg-secondary-fixed text-on-secondary-fixed" },
  { id: "saves", label: "Savers", unit: "saves", tone: "bg-success/15 text-success" },
];

export function PublicStats() {
  const { state, error } = usePublicState();
  const [cupId, setCupId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("goals");
  const tournament = state?.tournaments.find((item) => item.id === cupId) ?? state?.tournaments[0];
  const chosen = METRICS.find((item) => item.id === metric) ?? METRICS[0];
  const rows = state && tournament ? leaderboard(state, tournament.id, metric).filter((row) => row.value > 0).slice(0, 10) : [];
  const leader = rows[0];

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
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-gradient-to-br from-primary-fixed via-white to-secondary-fixed p-1.5">
            {METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={metric === item.id}
                onClick={() => setMetric(item.id)}
                className={`min-h-11 rounded-lg px-2 text-label-md ${metric === item.id ? "bg-primary text-on-primary" : item.tone}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <section className={`rounded-xl p-4 shadow-md ${metric === "saves" ? "bg-success text-on-primary" : metric === "assists" ? "bg-secondary text-on-secondary" : "bg-primary text-on-primary"}`}>
            <p className="text-label-sm tracking-wider uppercase opacity-80">{chosen.label}</p>
            {leader ? (
              <>
                <p className="mt-1 text-headline-lg">{leader.name}</p>
                <p className="text-label-md opacity-90">{leader.teamName}</p>
                <p className="mt-2 text-headline-xl tabular-nums">
                  {leader.value} <span className="text-label-lg">{chosen.unit}</span>
                </p>
              </>
            ) : (
              <p className="mt-2">No {chosen.unit} yet.</p>
            )}
          </section>
          <ol className="grid gap-2">
            {rows.slice(1).map((row, index) => (
              <li key={row.playerId} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-lowest px-4 py-3 shadow-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-label-md text-on-primary">{index + 2}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{row.name}</span>
                    <span className="block truncate text-body-sm text-on-surface-variant">{row.teamName}</span>
                  </span>
                </span>
                <span className="text-headline-md tabular-nums text-primary">{row.value}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </PublicShell>
  );
}
