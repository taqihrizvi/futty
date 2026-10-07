"use client";

import Link from "next/link";
import { formatMetric } from "@/lib/format";
import type { LeaderRow, Metric } from "@/lib/types";

export function LeaderList({
  rows,
  metric,
  limit,
}: {
  rows: LeaderRow[];
  metric: Metric;
  limit?: number;
}) {
  const visible = typeof limit === "number" ? rows.slice(0, limit) : rows;
  if (visible.length === 0) {
    return <p className="text-on-surface-variant">No records yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {visible.map((row, index) => (
        <li key={row.playerId}>
          <Link
            href={`/players/${row.playerId}`}
            className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-container-lowest px-4 py-3 shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-label-md text-on-primary-fixed">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-headline-md">{row.name}</span>
              <span className="block truncate text-body-sm text-on-surface-variant">
                {row.teamName}
                {row.detail ? ` · ${row.detail}` : ""}
              </span>
            </span>
            <span className="text-score-display text-primary">
              {formatMetric(metric, row.value)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
