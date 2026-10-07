"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useNow } from "@/components/deferred";
import { Icon, initials } from "@/components/icon";
import { matchLabel, playerById, playersForTeam, sideTeam, tournamentById } from "@/lib/derive";
import { elapsedSeconds, formatLabel, HALF_LIMIT_SECONDS, periodClock, REGULATION_SECONDS } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { CardColor, EventKind } from "@/lib/types";

type FlowKind = EventKind | "end";

type Flow = {
  kind: FlowKind;
  step: number;
  teamId?: string;
  playerId?: string;
};

export function LiveMatchScreen({ matchId }: { matchId: string }) {
  const app = useApp();
  const match = app.state.matches.find((item) => item.id === matchId);
  const running = Boolean(match?.clockRunning);
  const now = useNow(running);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (match?.status === "live" && match.clockRunning && !match.clockAnchor) {
      app.armClock(match.id);
    }
  }, [app, match]);

  useEffect(() => {
    if (!match || match.status !== "live" || !match.clockRunning || match.onBreak) return;
    if (elapsedSeconds(match, now) >= HALF_LIMIT_SECONDS) app.endHalf(match.id);
  }, [app, match, now]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!match) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Match not found</h1>
        <Link href="/matches" className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary">
          Back to matches
        </Link>
      </div>
    );
  }

  const tournament = tournamentById(app.state, match.tournamentId);
  const home = sideTeam(app.state, match, "home");
  const away = sideTeam(app.state, match, "away");
  const played = elapsedSeconds(match, now);
  const clock = periodClock(played);
  const events = app.state.events
    .filter((event) => event.matchId === match.id)
    .slice()
    .reverse();
  const canRecord = match.status === "live" && Boolean(home.id && away.id);

  function record(message: string) {
    setFlow(null);
    setToast(message);
  }

  const last = events[0];

  return (
    <div>
      <div className="mb-space-md flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-lowest px-3 py-space-sm shadow-sm sm:px-space-md">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-sm tracking-wider text-primary uppercase">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span>Match Console</span>
          </div>
          <span className="text-outline-variant">|</span>
          <div className="flex min-w-0 items-center gap-1 text-label-md text-on-surface">
            <Icon name="stadium" className="shrink-0 text-[18px] text-primary" />
            <span className="truncate">{match.venue}</span>
          </div>
          <span className="hidden text-body-sm text-on-surface-variant sm:inline">
            {matchLabel(app.state, match)} · {formatLabel(tournament?.format ?? "5v5")}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-surface-container-high px-2.5 py-1 text-label-sm text-primary">
          <Icon name="sync" className="text-[16px]" />
          <span className="hidden sm:inline">SYNC ACTIVE</span>
        </div>
      </div>

      <section className="relative mb-space-lg overflow-hidden rounded-xl bg-inverse-surface text-inverse-on-surface shadow-md">
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-primary-container" />
        <div className="p-3 lg:p-space-lg">
          <div className="grid grid-cols-1 items-center gap-space-md lg:grid-cols-12">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 lg:col-span-4 lg:gap-space-md lg:p-space-md">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-headline-md text-on-primary shadow-md sm:h-14 sm:w-14 sm:text-headline-lg">
                  {initials(home.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-headline-md text-inverse-on-surface sm:text-headline-lg">{home.name}</span>
                    <span className="shrink-0 rounded bg-primary-container px-1.5 py-0.5 text-label-sm text-on-primary uppercase">
                      Home
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-container text-headline-xl text-on-primary sm:h-16 sm:w-16 sm:text-display-hero">
                {match.homeScore}
              </div>
            </div>
            <div className="flex flex-col items-center px-space-sm text-center lg:col-span-4">
              <div className="mb-1 flex items-center gap-2">
                {match.clockRunning ? <span className="h-2.5 w-2.5 animate-ping rounded-full bg-primary-fixed" /> : null}
                <span className="text-label-md font-bold tracking-widest text-surface-bright uppercase">
                  {match.status === "finished" ||
                  (match.period === 2 && !match.clockRunning && !match.onBreak && played >= HALF_LIMIT_SECONDS)
                    ? "Full time"
                    : match.onBreak
                      ? "Half time"
                      : match.status === "live" && !match.clockRunning
                        ? `${match.period === 2 ? "2nd" : "1st"} half · stopped`
                        : match.status === "live"
                          ? `${match.period === 2 ? "2nd" : "1st"} half${played > REGULATION_SECONDS ? " · added time" : ""}`
                          : "Scheduled"}
                </span>
              </div>
              <div className={`text-inverse-on-surface ${played > REGULATION_SECONDS ? "text-headline-xl" : "text-display-hero"}`}>{clock}</div>
              <p className="mt-1 text-label-sm text-surface-bright/80">Each half 15:00, added time max +2:00</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {match.status === "scheduled" ? (
                  <button
                    type="button"
                    disabled={!home.id || !away.id}
                    onClick={() => app.startMatch(match.id)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary disabled:opacity-50"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Start
                  </button>
                ) : null}
                {match.status === "live" && match.clockRunning ? (
                  <button
                    type="button"
                    onClick={() => app.pauseMatch(match.id)}
                    className="flex items-center gap-1 rounded-lg bg-surface-container-highest px-3 py-1.5 text-label-md text-on-surface"
                  >
                    <Icon name="pause" className="text-[18px]" />
                    Stop
                  </button>
                ) : null}
                {match.status === "live" && !match.clockRunning && !match.onBreak && played < HALF_LIMIT_SECONDS ? (
                  <button
                    type="button"
                    onClick={() => app.resumeMatch(match.id)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Resume
                  </button>
                ) : null}
                {match.status === "live" && match.onBreak ? (
                  <button
                    type="button"
                    onClick={() => app.startSecondHalf(match.id)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-md text-on-primary"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Start 2nd half
                  </button>
                ) : null}
                {match.status === "live" && !match.onBreak && match.period === 1 ? (
                  <button
                    type="button"
                    onClick={() => app.endHalf(match.id)}
                    className="rounded-lg bg-error-container px-2.5 py-1.5 text-label-md text-on-error-container"
                  >
                    End half
                  </button>
                ) : null}
                {match.status === "live" && !match.onBreak && match.period === 2 ? (
                  <button
                    type="button"
                    onClick={() => setFlow({ kind: "end", step: 0 })}
                    className="rounded-lg bg-error-container px-2.5 py-1.5 text-label-md text-on-error-container"
                  >
                    End match
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 lg:col-span-4 lg:flex-row-reverse lg:gap-space-md lg:p-space-md">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-inverse-surface text-headline-md text-primary-fixed shadow-md sm:h-14 sm:w-14 sm:text-headline-lg">
                  {initials(away.name)}
                </div>
                <div className="min-w-0 text-right lg:text-left">
                  <div className="flex items-center justify-end gap-1.5 lg:justify-start">
                    <span className="shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-label-sm text-on-surface uppercase">
                      Away
                    </span>
                    <span className="truncate text-headline-md text-inverse-on-surface sm:text-headline-lg">{away.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-headline-xl text-inverse-on-surface sm:h-16 sm:w-16 sm:text-display-hero">
                {match.awayScore}
              </div>
            </div>
          </div>
        </div>
      </section>

      {canRecord ? (
        <div className="mb-space-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-label-md tracking-wide text-on-surface uppercase">
              <Icon name="touch_app" className="text-[20px] text-primary" />
              <span>Rapid Pitch-Side Incident Trigger</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-sm md:grid-cols-3 lg:grid-cols-6">
            <Pad icon="sports_soccer" label="+ Goal" className="bg-primary text-on-primary" onClick={() => setFlow({ kind: "goal", step: 0 })} />
            <Pad icon="trending_up" label="+ Assist" className="bg-tertiary-container text-on-primary" onClick={() => setFlow({ kind: "assist", step: 0 })} />
            <Pad icon="shield" label="+ GK Save" className="bg-surface-container-highest text-primary" onClick={() => setFlow({ kind: "save", step: 0 })} />
            <Pad icon="style" label="Foul / Card" className="bg-error-container text-on-error-container" onClick={() => setFlow({ kind: "card", step: 0 })} />
            <Pad icon="published_with_changes" label="Sub (5v5)" className="bg-surface-container-lowest text-on-surface" onClick={() => setFlow({ kind: "substitution", step: 0 })} />
            <Pad
              icon="undo"
              label={last ? `Undo (${last.minute}')` : "Undo"}
              className="bg-surface-container-low text-on-surface-variant"
              onClick={() => app.undoLast(match.id)}
            />
          </div>
        </div>
      ) : null}

      {!home.id || !away.id ? (
        <p className="mb-4 text-on-surface-variant">
          This tie is waiting for a winner from the previous round.
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {toast}
      </p>
      {toast ? (
        <p className="mb-4 rounded-xl bg-primary-fixed px-4 py-3 text-label-lg text-on-primary-fixed">
          {toast}
        </p>
      ) : null}

      <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        <h2 className="text-headline-md">Incident log</h2>
        <ul className="mt-3 space-y-2">
          {events.length === 0 ? (
            <li className="text-on-surface-variant">Nothing recorded yet.</li>
          ) : (
            events.map((event) => {
              const player = playerById(app.state, event.playerId);
              const related = playerById(app.state, event.relatedPlayerId ?? null);
              return (
                <li key={event.id} className="min-h-12 rounded-lg bg-surface-container-low px-4 py-3">
                  <span className="font-semibold tabular-nums">{event.minute}&apos;</span>{" "}
                  {labelEvent(event.kind, event.cardColor, player?.name, related?.name)}
                </li>
              );
            })
          )}
        </ul>
      </section>

      {flow ? (
        <EventFlow
          flow={flow}
          homeId={home.id}
          awayId={away.id}
          homeName={home.name}
          awayName={away.name}
          onClose={() => setFlow(null)}
          onChange={setFlow}
          onGoal={(teamId, playerId, assistId) => {
            app.addGoal(match.id, teamId, playerId, assistId);
            record("Goal recorded");
          }}
          onAssist={(teamId, playerId) => {
            app.addAssist(match.id, teamId, playerId);
            record("Assist recorded");
          }}
          onSave={(teamId, playerId) => {
            app.addSave(match.id, teamId, playerId);
            record("Save recorded");
          }}
          onCard={(teamId, playerId, color) => {
            app.addCard(match.id, teamId, playerId, color);
            record("Card recorded");
          }}
          onSub={(teamId, offId, onId) => {
            app.addSub(match.id, teamId, offId, onId);
            record("Substitution recorded");
          }}
          onEnd={() => {
            app.endMatch(match.id);
            record("Match ended");
          }}
        />
      ) : null}
    </div>
  );
}

function EventFlow({
  flow,
  homeId,
  awayId,
  homeName,
  awayName,
  onClose,
  onChange,
  onGoal,
  onAssist,
  onSave,
  onCard,
  onSub,
  onEnd,
}: {
  flow: Flow;
  homeId: string | null;
  awayId: string | null;
  homeName: string;
  awayName: string;
  onClose: () => void;
  onChange: (flow: Flow) => void;
  onGoal: (teamId: string, playerId: string, assistId?: string) => void;
  onAssist: (teamId: string, playerId: string) => void;
  onSave: (teamId: string, playerId: string) => void;
  onCard: (teamId: string, playerId: string, color: CardColor) => void;
  onSub: (teamId: string, offId: string, onId: string) => void;
  onEnd: () => void;
}) {
  const { state } = useApp();
  const title =
    flow.kind === "goal"
      ? "Goal"
      : flow.kind === "assist"
        ? "Assist"
        : flow.kind === "save"
          ? "Save"
          : flow.kind === "card"
            ? "Card"
            : flow.kind === "substitution"
              ? "Substitution"
              : "End match";

  const players = flow.teamId
    ? [...playersForTeam(state, flow.teamId)].sort((a, b) => {
        if (flow.kind === "save") {
          if (a.position === "Goalkeeper" && b.position !== "Goalkeeper") return -1;
          if (b.position === "Goalkeeper" && a.position !== "Goalkeeper") return 1;
        }
        return a.number - b.number;
      })
    : [];

  return (
    <BottomSheet title={title} onClose={onClose}>
      {flow.step > 0 ? (
        <button
          type="button"
          onClick={() => onChange({ ...flow, step: flow.step - 1 })}
          className="mb-3 min-h-12 text-label-lg text-primary"
        >
          Back
        </button>
      ) : null}

      {flow.kind === "end" ? (
        <div className="grid gap-3">
          <p className="text-on-surface-variant">The score stays as it is and the clock stops.</p>
          <button
            type="button"
            onClick={onEnd}
            className="min-h-14 rounded-xl bg-error px-4 text-label-lg text-on-primary"
          >
            End match now
          </button>
        </div>
      ) : null}

      {flow.kind !== "end" && flow.step === 0 && homeId && awayId ? (
        <div className="grid gap-3">
          <PickButton label={homeName} onClick={() => onChange({ ...flow, step: 1, teamId: homeId })} />
          <PickButton label={awayName} onClick={() => onChange({ ...flow, step: 1, teamId: awayId })} />
        </div>
      ) : null}

      {flow.step === 1 && flow.teamId ? (
        <div className="grid gap-3">
          {players.map((player) => (
            <PickButton
              key={player.id}
              label={`${player.name}  #${player.number}`}
              detail={player.position || undefined}
              onClick={() => {
                if (flow.kind === "assist") onAssist(flow.teamId!, player.id);
                else if (flow.kind === "save") onSave(flow.teamId!, player.id);
                else onChange({ ...flow, step: 2, playerId: player.id });
              }}
            />
          ))}
        </div>
      ) : null}

      {flow.step === 2 && flow.kind === "goal" && flow.teamId && flow.playerId ? (
        <div className="grid gap-3">
          <PickButton label="No assist" onClick={() => onGoal(flow.teamId!, flow.playerId!)} />
          {players
            .filter((player) => player.id !== flow.playerId)
            .map((player) => (
              <PickButton
                key={player.id}
                label={player.name}
                detail={player.position ? `#${player.number} · ${player.position}` : `#${player.number}`}
                onClick={() => onGoal(flow.teamId!, flow.playerId!, player.id)}
              />
            ))}
        </div>
      ) : null}

      {flow.step === 2 && flow.kind === "card" && flow.teamId && flow.playerId ? (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onCard(flow.teamId!, flow.playerId!, "yellow")}
            className="min-h-16 rounded-xl bg-warning px-4 text-headline-md text-navy"
          >
            Yellow card
          </button>
          <button
            type="button"
            onClick={() => onCard(flow.teamId!, flow.playerId!, "red")}
            className="min-h-16 rounded-xl bg-error px-4 text-headline-md text-on-primary"
          >
            Red card
          </button>
        </div>
      ) : null}

      {flow.step === 2 && flow.kind === "substitution" && flow.teamId && flow.playerId ? (
        <div className="grid gap-3">
          <p className="text-on-surface-variant">Player coming on</p>
          {players
            .filter((player) => player.id !== flow.playerId)
            .map((player) => (
              <PickButton
                key={player.id}
                label={player.name}
                detail={player.position ? `#${player.number} · ${player.position}` : `#${player.number}`}
                onClick={() => onSub(flow.teamId!, flow.playerId!, player.id)}
              />
            ))}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function PickButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-14 rounded-xl bg-surface-container-low px-4 py-3 text-left"
    >
      <span className="block text-headline-md">{label}</span>
      {detail ? <span className="block text-body-sm text-on-surface-variant">{detail}</span> : null}
    </button>
  );
}

function Pad({
  icon,
  label,
  className,
  onClick,
}: {
  icon: string;
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-label-md shadow-sm active:scale-95 sm:text-label-lg ${className}`}
    >
      <Icon name={icon} className="shrink-0 text-[22px]" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function labelEvent(
  kind: EventKind,
  color: CardColor | undefined,
  name?: string,
  related?: string,
) {
  const player = name ?? "Player";
  if (kind === "goal") return related ? `Goal · ${player}, assist ${related}` : `Goal · ${player}`;
  if (kind === "assist") return `Assist · ${player}`;
  if (kind === "save") return `Save · ${player}`;
  if (kind === "card") return `${color === "red" ? "Red" : "Yellow"} card · ${player}`;
  return related ? `Sub · ${player} off, ${related} on` : `Sub · ${player}`;
}
