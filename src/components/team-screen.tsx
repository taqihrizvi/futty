"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Avatar, PageHeader } from "@/components/ui";
import { leaderboard, playersForTeam, teamById } from "@/lib/derive";
import { useApp } from "@/lib/store";
import type { Player } from "@/lib/types";

const POSITIONS = ["Goalkeeper", "Defender", "Winger", "Pivot", "Striker"];

type Draft = {
  id?: string;
  name: string;
  number: string;
  position: string;
  teamId: string;
};

export function TeamScreen({ teamId }: { teamId: string }) {
  const app = useApp();
  const router = useRouter();
  const team = teamById(app.state, teamId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [moving, setMoving] = useState<Player | null>(null);
  const [removing, setRemoving] = useState<Player | null>(null);
  const [removingTeam, setRemovingTeam] = useState(false);

  if (!team) {
    return (
      <div>
        <PageHeader title="Team not found" />
        <Link href="/teams" className="font-semibold text-accent">
          All teams
        </Link>
      </div>
    );
  }

  const players = playersForTeam(app.state, team.id);
  const statsTournament = app.state.tournaments.find((item) =>
    item.teamIds.includes(team.id),
  );

  return (
    <div>
      <PageHeader title={team.name} detail={team.city || undefined} />
      <button
        type="button"
        onClick={() => setRemovingTeam(true)}
        className="mb-4 min-h-12 rounded-2xl px-4 text-label-lg font-semibold text-error"
      >
        Delete team
      </button>
      <button
        type="button"
        onClick={() =>
          setDraft({ name: "", number: "", position: "", teamId: team.id })
        }
        className="mb-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent px-4 text-lg font-semibold text-accent-ink"
      >
        Add player
      </button>
      <div className="grid gap-3">
        {players.map((player) => {
          const goals = stat(app.state, statsTournament?.id, player.id, "goals");
          const assists = stat(app.state, statsTournament?.id, player.id, "assists");
          const cards = stat(app.state, statsTournament?.id, player.id, "cards");
          return (
            <article key={player.id} className="rounded-2xl bg-pitch-2 p-4">
              <div className="flex gap-3">
                <Avatar name={player.name} />
                <div>
                  <h2 className="text-xl font-semibold">{player.name}</h2>
                  <p className="text-base text-muted">{playerLine(player)}</p>
                  <p className="mt-2 text-base">
                    {goals} goals · {assists} assists · {cards} cards
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/players/${player.id}`}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-pitch-3 px-2 text-center text-base font-semibold"
                >
                  View profile
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: player.id,
                      name: player.name,
                      number: String(player.number),
                      position: player.position ?? "",
                      teamId: player.teamId,
                    })
                  }
                  className="min-h-12 rounded-xl bg-pitch-3 px-2 text-base font-semibold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setMoving(player)}
                  className="min-h-12 rounded-xl bg-pitch-3 px-2 text-base font-semibold"
                >
                  Change team
                </button>
                <button
                  type="button"
                  onClick={() => setRemoving(player)}
                  className="min-h-12 rounded-xl bg-pitch-3 px-2 text-base font-semibold text-live"
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {draft ? (
        <BottomSheet
          title={draft.id ? "Edit player" : "Add player"}
          onClose={() => setDraft(null)}
        >
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const number = Number(draft.number);
              if (!draft.name.trim() || !Number.isFinite(number)) return;
              if (draft.id) {
                app.updatePlayer(draft.id, {
                  name: draft.name.trim(),
                  number,
                  position: draft.position.trim() || null,
                });
              } else {
                app.addPlayer({
                  name: draft.name.trim(),
                  number,
                  position: draft.position.trim() || null,
                  teamId: team.id,
                });
              }
              setDraft(null);
            }}
          >
            <label className="grid gap-1 text-base font-semibold">
              Name
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="min-h-12 rounded-2xl bg-pitch-3 px-4 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-base font-semibold">
              Number
              <input
                inputMode="numeric"
                value={draft.number}
                onChange={(event) => setDraft({ ...draft, number: event.target.value })}
                className="min-h-12 rounded-2xl bg-pitch-3 px-4 text-base font-normal"
              />
            </label>
            <div>
              <p className="text-base font-semibold">Position</p>
              <p className="text-sm text-muted">Optional. Leave it unset until you know where they play.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      position: draft.position === position ? "" : position,
                    })
                  }
                  className={
                    draft.position === position
                      ? "min-h-11 rounded-full bg-accent px-4 font-semibold text-accent-ink"
                      : "min-h-11 rounded-full bg-pitch-3 px-4 font-semibold"
                  }
                >
                  {position}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="min-h-14 rounded-2xl bg-accent px-4 text-lg font-semibold text-accent-ink"
            >
              Save player
            </button>
          </form>
        </BottomSheet>
      ) : null}

      {moving ? (
        <BottomSheet title="Change team" onClose={() => setMoving(null)}>
          <div className="grid gap-2">
            {app.state.teams.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  app.updatePlayer(moving.id, { teamId: item.id });
                  setMoving(null);
                }}
                className="min-h-14 rounded-2xl bg-pitch-3 px-4 text-left text-lg font-semibold"
              >
                {item.name}
              </button>
            ))}
          </div>
        </BottomSheet>
      ) : null}

      {removing ? (
        <BottomSheet title="Remove player" onClose={() => setRemoving(null)}>
          <p className="text-base text-muted">
            Remove {removing.name} from {team.name}?
          </p>
          <button
            type="button"
            onClick={() => {
              app.removePlayer(removing.id);
              setRemoving(null);
            }}
            className="mt-4 min-h-14 w-full rounded-2xl bg-live px-4 text-lg font-semibold text-white"
          >
            Remove player
          </button>
        </BottomSheet>
      ) : null}
      {removingTeam ? (
        <BottomSheet title="Delete team" onClose={() => setRemovingTeam(false)}>
          <p className="text-base text-on-surface-variant">
            Delete {team.name}? This removes the squad and its players. Fixtures keep their scores, with this side left open.
          </p>
          <button
            type="button"
            onClick={() => {
              app.removeTeam(team.id);
              router.push("/teams");
            }}
            className="mt-4 min-h-14 w-full rounded-2xl bg-error px-4 text-lg font-semibold text-on-primary"
          >
            Delete team
          </button>
        </BottomSheet>
      ) : null}
    </div>
  );
}

function playerLine(player: Player) {
  return player.position ? `#${player.number} · ${player.position}` : `#${player.number}`;
}

function stat(
  state: ReturnType<typeof useApp>["state"],
  tournamentId: string | undefined,
  playerId: string,
  metric: "goals" | "assists" | "cards",
) {
  if (!tournamentId) return 0;
  return leaderboard(state, tournamentId, metric).find((row) => row.playerId === playerId)
    ?.value ?? 0;
}
