"use client";

import Link from "next/link";
import { initials } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { useApp } from "@/lib/store";

export function TeamsScreen() {
  const { state } = useApp();

  return (
    <div>
      <PageHeader title="Teams" detail="Open a squad to add or edit players." />
      <div className="grid gap-3 sm:grid-cols-2">
        {state.teams.map((team) => {
          const count = state.players.filter((player) => player.teamId === team.id).length;
          return (
            <Link key={team.id} href={`/teams/${team.id}`} className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-headline-md text-on-primary">
                {initials(team.name)}
              </span>
              <span>
                <span className="block text-headline-md">{team.name}</span>
                <span className="mt-1 block text-body-sm text-on-surface-variant">
                  {[team.city, `${count} players`].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
