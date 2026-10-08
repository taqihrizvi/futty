"use client";

import { useState } from "react";
import { LeaderList } from "@/components/leaders";
import { Chip, PageHeader } from "@/components/ui";
import { leaderboard } from "@/lib/derive";
import { useApp } from "@/lib/store";
import type { Metric } from "@/lib/types";

const METRICS: { id: Metric; label: string }[] = [
  { id: "goals", label: "Goals" },
  { id: "assists", label: "Assists" },
  { id: "saves", label: "Saves" },
  { id: "cleanSheets", label: "Clean sheets" },
  { id: "cards", label: "Cards" },
  { id: "rating", label: "Rating" },
  { id: "performance", label: "Performance" },
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
      <div className="mb-4 grid grid-cols-2 gap-1 sm:grid-cols-4" role="tablist" aria-label="Statistic">
        {METRICS.map((item) => (
          <Chip
            key={item.id}
            active={metric === item.id}
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
