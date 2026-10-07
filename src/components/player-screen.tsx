"use client";

import Link from "next/link";
import { Avatar, PageHeader } from "@/components/ui";
import { formatMetric } from "@/lib/format";
import { leaderboard, playerById, teamById } from "@/lib/derive";
import { useApp } from "@/lib/store";
import type { Metric } from "@/lib/types";

const METRICS: Metric[] = [
  "goals",
  "assists",
  "saves",
  "cleanSheets",
  "cards",
  "rating",
  "performance",
];

const LABELS: Record<Metric, string> = {
  goals: "Goals",
  assists: "Assists",
  saves: "Saves",
  cleanSheets: "Clean sheets",
  cards: "Cards",
  rating: "Rating",
  performance: "Performance",
};

export function PlayerScreen({ playerId }: { playerId: string }) {
  const { state } = useApp();
  const player = playerById(state, playerId);
  if (!player) {
    return (
      <div>
        <PageHeader title="Player not found" />
        <Link href="/teams" className="font-semibold text-accent">
          All teams
        </Link>
      </div>
    );
  }
  const team = teamById(state, player.teamId);
  const tournament = state.tournaments.find((item) => item.teamIds.includes(player.teamId));
  const events = state.events
    .filter(
      (event) => event.playerId === player.id || event.relatedPlayerId === player.id,
    )
    .slice()
    .reverse()
    .slice(0, 8);

  return (
    <div>
      <div className="flex gap-4">
        <Avatar name={player.name} />
        <PageHeader
          eyebrow={team?.name}
          title={player.name}
          detail={player.position ? `#${player.number} · ${player.position}` : `#${player.number}`}
        />
      </div>
      {team ? (
        <Link
          href={`/teams/${team.id}`}
          className="mb-4 inline-flex min-h-12 items-center font-semibold text-accent"
        >
          Back to {team.name}
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map((metric) => {
          const value = tournament
            ? (leaderboard(state, tournament.id, metric).find((row) => row.playerId === player.id)
                ?.value ?? 0)
            : 0;
          return (
            <article key={metric} className="rounded-2xl bg-pitch-2 p-4">
              <p className="text-sm font-semibold text-muted">{LABELS[metric]}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMetric(metric, value)}
              </p>
            </article>
          );
        })}
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Recent events</h2>
        <ul className="mt-3 space-y-2">
          {events.length === 0 ? (
            <li className="text-base text-muted">No events yet.</li>
          ) : (
            events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-pitch-2 px-4 py-3 text-base">
                {event.minute}&apos; · {event.kind}
                {event.cardColor ? ` · ${event.cardColor}` : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
