"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNow } from "@/components/deferred";
import { Icon } from "@/components/icon";
import { sideTeam } from "@/lib/derive";
import { dayLabel, elapsedSeconds, periodClock } from "@/lib/format";
import type { AppState, Match } from "@/lib/types";

export function usePublicState() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/public");
        const data = (await response.json()) as AppState & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "The board could not load");
        if (!cancelled) {
          setState(data);
          setError("");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The board could not load");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { state, error };
}

export function PublicStatus({ error, state }: { error: string; state: AppState | null }) {
  if (error) return <p className="mb-4 rounded-xl bg-error-container px-4 py-3 text-on-error-container">{error}</p>;
  if (!state) return <p className="text-on-surface-variant">Loading the board…</p>;
  return null;
}

export function KpiLink({
  href,
  label,
  value,
  note,
  icon,
  cardClass,
}: {
  href: string;
  label: string;
  value: string;
  note: string;
  icon: string;
  cardClass: string;
}) {
  return (
    <Link href={href} className={`flex items-center justify-between gap-2 rounded-xl p-3 shadow-md sm:p-4 ${cardClass}`}>
      <span className="min-w-0">
        <span className="block text-label-sm tracking-wider uppercase opacity-80">{label}</span>
        <span className="mt-1 block text-headline-lg sm:text-headline-xl">{value}</span>
        <span className="mt-1 block truncate text-label-sm opacity-90">{note}</span>
      </span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Icon name={icon} className="text-[22px]" />
      </span>
    </Link>
  );
}

export function Band({
  eyebrow,
  title,
  href,
  action,
  tone = "bg-primary",
  children,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  action?: string;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <div className={`flex items-center justify-between gap-3 px-4 py-3 text-on-primary ${tone}`}>
        <div className="min-w-0">
          {eyebrow ? <p className="truncate text-label-sm tracking-wider text-primary-fixed uppercase">{eyebrow}</p> : null}
          <h2 className="text-headline-md">{title}</h2>
        </div>
        {href && action ? (
          <Link href={href} className="shrink-0 text-label-md text-primary-fixed">
            {action}
          </Link>
        ) : null}
      </div>
      <div className="grid gap-2 p-3">{children}</div>
    </section>
  );
}

export function LiveScore({ state, match }: { state: AppState; match: Match }) {
  const now = useNow(match.clockRunning);
  const home = sideTeam(state, match, "home");
  const away = sideTeam(state, match, "away");
  return (
    <article className="relative overflow-hidden rounded-xl bg-inverse-surface p-4 text-inverse-on-surface shadow-md">
      <p className="text-label-sm tracking-wider text-primary-fixed uppercase">
        Live · {periodClock(elapsedSeconds(match, now))}
        {match.venue ? ` · ${match.venue}` : ""}
      </p>
      <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <p className="truncate text-headline-md">{home.name}</p>
        <p className="w-fit rounded-lg bg-white/15 px-4 py-1 text-headline-xl tabular-nums">
          {match.homeScore}–{match.awayScore}
        </p>
        <p className="truncate sm:text-right text-headline-md">{away.name}</p>
      </div>
    </article>
  );
}

export function Fixture({ state, match }: { state: AppState; match: Match }) {
  const home = sideTeam(state, match, "home");
  const away = sideTeam(state, match, "away");
  const live = match.status === "live";
  const finished = match.status === "finished";
  return (
    <article className={`rounded-xl border-l-4 p-3 ${live ? "border-error bg-error-container/40" : finished ? "border-success bg-success/10" : "border-secondary bg-secondary-fixed/60"}`}>
      <p className="text-label-sm text-outline">
        {live ? "In play" : finished ? "Full time" : `${dayLabel(match.dayOffset)} · ${match.time}`}
        {match.venue ? ` · ${match.venue}` : ""}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="truncate font-semibold">{home.name}</span>
        <span className="shrink-0 tabular-nums font-bold">{live || finished ? match.homeScore : ""}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-semibold">{away.name}</span>
        <span className="shrink-0 tabular-nums font-bold">{live || finished ? match.awayScore : "vs"}</span>
      </div>
    </article>
  );
}
