"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { sideTeam, winnerId } from "@/lib/derive";
import { roundLabel } from "@/lib/format";
import { seededRoundId } from "@/lib/knockout";
import { useApp } from "@/lib/store";
import type { RoundId, Tournament } from "@/lib/types";

export function Bracket({ tournament }: { tournament: Tournament }) {
  const { state } = useApp();
  const seeded = seededRoundId(tournament);
  const rounds = tournament.knockoutRounds.filter((item) => {
    const ties = state.matches.filter((match) => match.tournamentId === tournament.id && match.round === item);
    if (item === seeded) return ties.length > 0;
    return ties.some(
      (match) => match.homeTeamId || match.awayTeamId || match.homeFromMatchId || match.awayFromMatchId,
    );
  });
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const round = rounds[index] ?? rounds[0];
  const ties = state.matches.filter(
    (match) => match.tournamentId === tournament.id && match.round === round,
  );

  if (!round) {
    return <p className="text-base text-muted">No knockout round is set.</p>;
  }

  return (
    <div
      onTouchStart={(event) => {
        startX.current = event.changedTouches[0]?.clientX ?? 0;
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX ?? 0;
        const delta = end - startX.current;
        if (delta > 48) setIndex((current) => Math.max(0, current - 1));
        if (delta < -48) setIndex((current) => Math.min(rounds.length - 1, current + 1));
      }}
    >
      <div className="flex gap-2 overflow-x-auto pb-3">
        {rounds.map((item, itemIndex) => (
          <button
            key={item}
            type="button"
            onClick={() => setIndex(itemIndex)}
            className={
              itemIndex === index
                ? "min-h-11 shrink-0 rounded-full bg-accent px-4 text-base font-semibold text-accent-ink"
                : "min-h-11 shrink-0 rounded-full bg-pitch-3 px-4 text-base font-semibold"
            }
          >
            {roundLabel(item)}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Swipe for the next round
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:overflow-x-auto">
        {ties.length === 0 ? (
          <p className="text-base text-muted">No ties in this round yet.</p>
        ) : (
          ties.map((match) => {
            const home = sideTeam(state, match, "home");
            const away = sideTeam(state, match, "away");
            const winner = winnerId(match);
            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="min-w-0 rounded-xl bg-surface-container-lowest p-4 shadow-sm md:min-w-72 md:shrink-0"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                  {roundLabel(match.round as RoundId)}
                </p>
                <ScoreLine name={home.name} score={match.status === "scheduled" ? null : match.homeScore} />
                <ScoreLine name={away.name} score={match.status === "scheduled" ? null : match.awayScore} />
                <p className="mt-3 text-base font-semibold text-accent">
                  {winner
                    ? `${sideTeam(state, { ...match, homeTeamId: winner, awayTeamId: null }, "home").name} advances`
                    : "Winner advances"}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function ScoreLine({ name, score }: { name: string; score: number | null }) {
  return (
    <p className="mt-2 flex items-center justify-between gap-3 text-lg font-semibold">
      <span>{name}</span>
      <span className="tabular-nums">{score == null ? "–" : score}</span>
    </p>
  );
}
