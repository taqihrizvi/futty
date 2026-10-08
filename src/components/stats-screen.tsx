"use client";

import { useState } from "react";
import { LeaderList } from "@/components/leaders";
import { Chip, PageHeader } from "@/components/ui";
import { leaderboard } from "@/lib/derive";
import { useApp } from "@/lib/store";
import type { Metric } from "@/lib/types";

const METRICS: { id: Metric; label: string; tone: string }[] = [
  { id: "goals", label: "Goals", tone: "bg-primary-fixed text-on-primary-fixed" },
  { id: "assists", label: "Assists", tone: "bg-secondary-fixed text-on-secondary-fixed" },
  { id: "saves", label: "Saves", tone: "bg-success/15 text-success" },
  { id: "cleanSheets", label: "Clean sheets", tone: "bg-warning/25 text-navy" },
  { id: "cards", label: "Cards", tone: "bg-error-container text-on-error-container" },
  { id: "rating", label: "Rating", tone: "bg-secondary-container/30 text-on-secondary-fixed" },
  { id: "performance", label: "Performance", tone: "bg-primary-container/15 text-primary" },
];

export function StatsScreen({ initialMetric }: { initialMetric?: string }) {
  const { state } = useApp();
  const starting = METRICS.some((item) => item.id === initialMetric)
    ? (initialMetric as Metric)
    : "goals";
  const [metric, setMetric] = useState<Metric>(starting);
  const [tournamentId, setTournamentId] = useState(state.tournaments[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);
  const rows = tournamentId ? leaderboard(state, tournamentId, metric) : [];
  const title = METRICS.find((item) => item.id === metric)?.label ?? "Statistics";

  return (
    <div>
      <PageHeader title="Statistics" detail="Switch the list without leaving the page." />
      {state.tournaments.length > 1 ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {state.tournaments.map((tournament) => (
            <Chip
              key={tournament.id}
              active={tournament.id === tournamentId}
              onClick={() => setTournamentId(tournament.id)}
            >
              {tournament.name}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gradient-to-br from-secondary-fixed via-white to-primary-fixed p-1.5 sm:grid-cols-4" role="tablist" aria-label="Statistic">
        {METRICS.map((item) => (
          <Chip
            key={item.id}
            active={metric === item.id}
            tone={item.tone}
            className="w-full shrink px-2"
            onClick={() => {
              setMetric(item.id);
              setExpanded(false);
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <LeaderList rows={rows} metric={metric} limit={expanded ? 20 : 8} />
      {rows.length > 8 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 min-h-14 w-full rounded-xl bg-surface-container-lowest text-label-lg shadow-sm"
        >
          View all
        </button>
      ) : null}
    </div>
  );
}
