"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useNow } from "@/components/deferred";
import { Icon, initials } from "@/components/icon";
import { matchLabel, playerById, playersForTeam, sideTeam, tournamentById } from "@/lib/derive";
import { elapsedSeconds, formatLabel, HALF_LIMIT_SECONDS, periodClock, REGULATION_SECONDS } from "@/lib/format";
import { hasLineup, isSentOff, onPitchIds, sideSize, starterIds } from "@/lib/lineup";
import { useApp } from "@/lib/store";
import type { CardColor, EventKind, Match, MatchEvent, Player } from "@/lib/types";

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
  const [lineupOpen, setLineupOpen] = useState(false);
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
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2 rounded-xl bg-surface-container-lowest px-3 py-2.5 shadow-sm">
        <p className="min-w-0 truncate text-label-md text-on-surface">
          {match.venue} · {matchLabel(app.state, match)} · {formatLabel(tournament?.format ?? "5v5")}
        </p>
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
                    <span className="hidden shrink-0 rounded bg-primary-container px-1.5 py-0.5 text-label-sm text-on-primary uppercase sm:inline">
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
                    ? match.penaltyWinnerId
                      ? "Full time · penalties"
                      : "Full time"
                    : match.onBreak
                      ? "Half time"
                      : match.status === "live" && !match.clockRunning
                        ? `${match.period === 2 ? "2nd" : "1st"} half · stopped`
                        : match.status === "live"
                          ? `${match.period === 2 ? "2nd" : "1st"} half${played > REGULATION_SECONDS ? " · added time" : ""}`
                          : "Scheduled"}
                </span>
              </div>
              <div className={`text-inverse-on-surface ${played > REGULATION_SECONDS ? "text-headline-lg sm:text-headline-xl" : "text-headline-xl sm:text-display-hero"}`}>{clock}</div>
              <p className="mt-1 text-label-sm text-surface-bright/80">15:00 per half, plus at most 2:00</p>
              <div className="mt-3 grid w-full grid-cols-2 gap-2">
                {match.status === "scheduled" ? (
                  <button
                    type="button"
                    disabled={!home.id || !away.id}
                    onClick={() => setLineupOpen(true)}
                    className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-label-md text-on-primary disabled:opacity-50"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Start
                  </button>
                ) : null}
                {match.status === "live" && match.clockRunning ? (
                  <button
                    type="button"
                    onClick={() => app.pauseMatch(match.id)}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-lg bg-surface-container-highest px-3 text-label-md text-on-surface"
                  >
                    <Icon name="pause" className="text-[18px]" />
                    Stop
                  </button>
                ) : null}
                {match.status === "live" && !match.clockRunning && !match.onBreak && played < HALF_LIMIT_SECONDS ? (
                  <button
                    type="button"
                    onClick={() => app.resumeMatch(match.id)}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-label-md text-on-primary"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Resume
                  </button>
                ) : null}
                {match.status === "live" && match.onBreak ? (
                  <button
                    type="button"
                    onClick={() => app.startSecondHalf(match.id)}
                    className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-label-md text-on-primary"
                  >
                    <Icon name="play_arrow" className="text-[18px]" />
                    Start 2nd half
                  </button>
                ) : null}
                {match.status === "live" && !match.onBreak && match.period === 1 ? (
                  <button
                    type="button"
                    onClick={() => app.endHalf(match.id)}
                    className="flex min-h-11 items-center justify-center rounded-lg bg-error-container px-3 text-label-md text-on-error-container"
                  >
                    End half
                  </button>
                ) : null}
                {match.status === "finished" &&
                match.stage === "knockout" &&
                match.homeScore === match.awayScore &&
                !match.penaltyWinnerId &&
                home.id &&
                away.id ? (
                  <button
                    type="button"
                    onClick={() => setFlow({ kind: "end", step: 0 })}
                    className="col-span-2 flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-label-md text-on-primary"
                  >
                    Penalties
                  </button>
                ) : null}
                {match.penaltyWinnerId ? (
                  <p className="col-span-2 w-full text-label-sm text-primary-fixed">
                    {(match.penaltyWinnerId === home.id ? home.name : away.name)} won on penalties
                  </p>
                ) : null}
                {match.status === "live" && !match.onBreak && match.period === 2 ? (
                  <button
                    type="button"
                    onClick={() => setFlow({ kind: "end", step: 0 })}
                    className="flex min-h-11 items-center justify-center rounded-lg bg-error-container px-3 text-label-md text-on-error-container"
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
                    <span className="hidden shrink-0 rounded bg-surface-container-highest px-1.5 py-0.5 text-label-sm text-on-surface uppercase sm:inline">
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

      {hasLineup(match) && home.id && away.id ? (
        <PitchBoard statePlayers={app.state.players} match={match} events={app.state.events} homeName={home.name} awayName={away.name} />
      ) : null}

      {canRecord ? (
        <div className="mb-space-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-label-md tracking-wide text-on-surface uppercase">
              <Icon name="touch_app" className="text-[20px] text-primary" />
              <span>Record</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-sm md:grid-cols-3 lg:grid-cols-6">
            <Pad icon="sports_soccer" label="+ Goal" className="bg-primary text-on-primary" onClick={() => setFlow({ kind: "goal", step: 0 })} />
            <Pad icon="trending_up" label="+ Assist" className="bg-tertiary-container text-on-primary" onClick={() => setFlow({ kind: "assist", step: 0 })} />
            <Pad icon="shield" label="+ GK Save" className="bg-surface-container-highest text-primary" onClick={() => setFlow({ kind: "save", step: 0 })} />
            <Pad icon="style" label="Foul / Card" className="bg-error-container text-on-error-container" onClick={() => setFlow({ kind: "card", step: 0 })} />
            <Pad icon="published_with_changes" label="Rolling sub" className="bg-surface-container-lowest text-on-surface" onClick={() => setFlow({ kind: "substitution", step: 0 })} />
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

      {lineupOpen && home.id && away.id ? (
        <LineupSheet
          match={match}
          size={sideSize(tournament?.format ?? "5v5")}
          homeName={home.name}
          awayName={away.name}
          onClose={() => setLineupOpen(false)}
          onStart={(homePlayerIds, awayPlayerIds) => {
            setLineupOpen(false);
            app.startMatch(match.id, homePlayerIds, awayPlayerIds);
            record("Match started");
          }}
        />
      ) : null}

      {flow ? (
        <EventFlow
          flow={flow}
          match={match}
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
            const yellows = app.state.events.filter(
              (event) => event.matchId === match.id && event.kind === "card" && event.playerId === playerId && event.cardColor === "yellow",
            ).length;
            app.addCard(match.id, teamId, playerId, color);
            record(color === "red" || yellows >= 1 ? "Sent off for this match" : "Card recorded");
          }}
          onSub={(teamId, offId, onId) => {
            app.addSub(match.id, teamId, offId, onId);
            record("Substitution recorded");
          }}
          levelKnockout={match.stage === "knockout" && match.homeScore === match.awayScore}
          finished={match.status === "finished"}
          onEnd={(teamId) => {
            app.endMatch(match.id, teamId);
            record(teamId ? "Penalties recorded" : "Match ended");
          }}
          onPenalties={(teamId) => {
            app.recordPenalties(match.id, teamId);
            record("Penalties recorded");
          }}
        />
      ) : null}
    </div>
  );
}

function EventFlow({
  flow,
  match,
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
  onPenalties,
  levelKnockout,
  finished,
}: {
  flow: Flow;
  match: Match;
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
  onEnd: (penaltyWinnerId?: string) => void;
  onPenalties: (teamId: string) => void;
  levelKnockout: boolean;
  finished: boolean;
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

  const matchEvents = state.events.filter((event) => event.matchId === match.id);
  const lined = hasLineup(match);
  const pitch = flow.teamId ? onPitchIds(starterIds(match, flow.teamId), matchEvents, flow.teamId) : new Set<string>();
  const squad = flow.teamId
    ? [...playersForTeam(state, flow.teamId)].sort((a, b) => {
        if (flow.kind === "save") {
          if (a.position === "Goalkeeper" && b.position !== "Goalkeeper") return -1;
          if (b.position === "Goalkeeper" && a.position !== "Goalkeeper") return 1;
        }
        return a.number - b.number;
      })
    : [];
  const comingOff = lined ? squad.filter((player) => pitch.has(player.id)) : squad;
  const comingOn = squad.filter((player) => {
    if (player.id === flow.playerId) return false;
    if (!lined) return true;
    return !pitch.has(player.id) && !isSentOff(matchEvents, player.id);
  });
  const onField = lined ? squad.filter((player) => pitch.has(player.id)) : squad;
  const players = flow.kind === "substitution" && flow.step >= 2 ? comingOn : flow.kind === "substitution" ? comingOff : onField;

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

      {flow.kind === "end" && levelKnockout && homeId && awayId ? (
        <div className="grid gap-3">
          <p className="text-on-surface-variant">
            The score stays level. Who won on penalties?
          </p>
          <PickButton
            label={homeName}
            onClick={() => (finished ? onPenalties(homeId) : onEnd(homeId))}
          />
          <PickButton
            label={awayName}
            onClick={() => (finished ? onPenalties(awayId) : onEnd(awayId))}
          />
        </div>
      ) : null}

      {flow.kind === "end" && !levelKnockout ? (
        <div className="grid gap-3">
          <p className="text-on-surface-variant">The score stays as it is and the clock stops.</p>
          <button
            type="button"
            onClick={() => onEnd()}
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
          {flow.kind === "substitution" ? (
            <p className="text-on-surface-variant">
              Player coming off. They can come back on later in this match.
            </p>
          ) : null}
          {players.length === 0 ? (
            <p className="text-on-surface-variant">No one on the pitch can be selected.</p>
          ) : null}
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
          <p className="text-body-sm text-on-surface-variant">
            A red card, or a second yellow in this match, sends them off. They cannot come back on.
          </p>
        </div>
      ) : null}

      {flow.step === 2 && flow.kind === "substitution" && flow.teamId && flow.playerId ? (
        <div className="grid gap-3">
          <p className="text-on-surface-variant">
            Player coming on. They can roll on and off until a red card or a second yellow in this match.
          </p>
          {players.length === 0 ? (
            <p className="text-on-surface-variant">No one on the bench can come on.</p>
          ) : null}
          {players.map((player) => (
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

function LineupSheet({
  match,
  size,
  homeName,
  awayName,
  onClose,
  onStart,
}: {
  match: Match;
  size: number;
  homeName: string;
  awayName: string;
  onClose: () => void;
  onStart: (homePlayerIds: string[], awayPlayerIds: string[]) => void;
}) {
  const { state } = useApp();
  const [step, setStep] = useState<"home" | "away">("home");
  const [homeIds, setHomeIds] = useState<string[]>([]);
  const [awayIds, setAwayIds] = useState<string[]>([]);
  const teamId = step === "home" ? match.homeTeamId : match.awayTeamId;
  const teamName = step === "home" ? homeName : awayName;
  const selected = step === "home" ? homeIds : awayIds;
  const players = teamId ? playersForTeam(state, teamId) : [];
  const short = players.length < size;

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((playerId) => playerId !== id)
      : selected.length >= size
        ? selected
        : [...selected, id];
    if (step === "home") setHomeIds(next);
    else setAwayIds(next);
  }

  return (
    <BottomSheet title={`${teamName} starters`} onClose={onClose}>
      <p className="text-on-surface-variant">
        Pick {size} starting players. Anyone else can roll on and off during the match, until a red card or a second yellow.
      </p>
      {short ? (
        <p className="mt-3 text-on-surface">
          {teamName} has {players.length} {players.length === 1 ? "player" : "players"}. Add at least {size} on the{" "}
          <Link href={`/teams/${teamId}`} className="font-semibold text-primary">
            team page
          </Link>{" "}
          before kickoff.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {players.map((player) => {
            const pressed = selected.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggle(player.id)}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-left ${
                  pressed ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"
                }`}
              >
                <span className="text-headline-md">{player.name}</span>
                <span className="shrink-0 text-label-md">#{player.number}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-label-lg">
        {selected.length} of {size}
      </p>
      <div className="mt-3 grid gap-2">
        {step === "away" ? (
          <button type="button" onClick={() => setStep("home")} className="min-h-12 text-left text-label-lg text-primary">
            Back
          </button>
        ) : null}
        {step === "home" ? (
          <button
            type="button"
            disabled={homeIds.length !== size}
            onClick={() => setStep("away")}
            className="min-h-14 rounded-xl bg-primary px-4 text-label-lg text-on-primary disabled:opacity-50"
          >
            Next: {awayName}
          </button>
        ) : (
          <button
            type="button"
            disabled={awayIds.length !== size}
            onClick={() => onStart(homeIds, awayIds)}
            className="min-h-14 rounded-xl bg-primary px-4 text-label-lg text-on-primary disabled:opacity-50"
          >
            Start match
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function PitchBoard({
  statePlayers,
  match,
  events,
  homeName,
  awayName,
}: {
  statePlayers: Player[];
  match: Match;
  events: MatchEvent[];
  homeName: string;
  awayName: string;
}) {
  const matchEvents = events.filter((event) => event.matchId === match.id);
  return (
    <section className="mb-space-lg rounded-xl bg-surface-container-lowest p-4 shadow-sm">
      <h2 className="text-headline-md">On the pitch</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Rolling subs. A player can come on and off until a red card or a second yellow in this match.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <PitchSide name={homeName} teamId={match.homeTeamId} players={statePlayers} match={match} events={matchEvents} />
        <PitchSide name={awayName} teamId={match.awayTeamId} players={statePlayers} match={match} events={matchEvents} />
      </div>
    </section>
  );
}

function PitchSide({
  name,
  teamId,
  players,
  match,
  events,
}: {
  name: string;
  teamId: string | null;
  players: Player[];
  match: Match;
  events: MatchEvent[];
}) {
  const squad = teamId ? players.filter((player) => player.teamId === teamId).sort((a, b) => a.number - b.number) : [];
  const on = teamId ? onPitchIds(starterIds(match, teamId), events, teamId) : new Set<string>();
  const playing = squad.filter((player) => on.has(player.id));
  const sent = squad.filter((player) => isSentOff(events, player.id));
  return (
    <div>
      <h3 className="text-label-lg">{name}</h3>
      <ul className="mt-1 space-y-1">
        {playing.map((player) => (
          <li key={player.id} className="text-body-sm">
            {player.name} <span className="text-on-surface-variant">#{player.number}</span>
          </li>
        ))}
      </ul>
      {sent.length > 0 ? (
        <p className="mt-2 text-body-sm text-error">Sent off: {sent.map((player) => player.name).join(", ")}</p>
      ) : null}
    </div>
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
