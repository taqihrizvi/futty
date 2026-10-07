"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { initials } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { Team } from "@/lib/types";

export function TeamsScreen() {
  const { state, removeTeam } = useApp();
  const [pending, setPending] = useState<Team | null>(null);

  return (
    <div>
      <PageHeader title="Teams" detail="Open a squad to add or edit players." />
      <div className="grid gap-3 sm:grid-cols-2">
        {state.teams.map((team) => {
          const count = state.players.filter((player) => player.teamId === team.id).length;
          return (
            <article
              key={team.id}
              className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm"
            >
              <Link href={`/teams/${team.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-headline-md text-on-primary">
                  {initials(team.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-headline-md">{team.name}</span>
                  <span className="mt-1 block text-body-sm text-on-surface-variant">
                    {[team.city, `${count} players`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setPending(team)}
                className="shrink-0 rounded-xl px-3 py-2 text-label-md font-semibold text-error"
              >
                Delete
              </button>
            </article>
          );
        })}
      </div>
      {pending ? (
        <BottomSheet title="Delete team" onClose={() => setPending(null)}>
          <p className="text-base text-on-surface-variant">
            Delete {pending.name}? This removes the squad and its players. Fixtures keep their scores, with this side left open.
          </p>
          <button
            type="button"
            onClick={() => {
              removeTeam(pending.id);
              setPending(null);
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
