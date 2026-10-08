"use client";

import Link from "next/link";
import { useNow } from "@/components/deferred";
import { Icon, initials } from "@/components/icon";
import { matchLabel, sideTeam } from "@/lib/derive";
import { elapsedSeconds, periodClock } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Match } from "@/lib/types";

export function MatchCard({ match }: { match: Match }) {
  const { state } = useApp();
  const now = useNow(match.status === "live" && match.clockRunning);
  const home = sideTeam(state, match, "home");
  const away = sideTeam(state, match, "away");
  const live = match.status === "live";
  const finished = match.status === "finished";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 items-center gap-space-md">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-fixed">
          <span className="text-label-sm font-bold text-on-primary-fixed">{initials(home.name, 2)}</span>
          <span className="text-label-sm text-primary">{initials(away.name, 2)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm text-outline">
            {match.venue} · {matchLabel(state, match)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-on-surface">{home.name}</span>
            <span className="shrink-0 tabular-nums font-bold text-on-surface">
              {finished || live ? match.homeScore : ""}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-on-surface">{away.name}</span>
            <span className="shrink-0 tabular-nums font-bold text-on-surface">
              {finished || live ? match.awayScore : match.time}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-label-sm font-bold tracking-wider uppercase ${live ? "bg-surface-container text-primary" : "bg-surface-container-high text-on-surface-variant"}`}
        >
          {live ? `Live ${periodClock(elapsedSeconds(match, now))}` : finished ? "Final Result" : `${match.time}`}
        </span>
        <Icon name="chevron_right" className="text-[18px] text-outline" />
      </div>
    </Link>
  );
}
