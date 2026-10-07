"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { signOut } from "@/lib/sign-out";
import { useApp } from "@/lib/store";

export function MoreScreen() {
  const { state, setMyTeam, reset } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <PageHeader
        title="More"
        detail="Organizer tools and the team used by the My team filter."
      />
      <div className="grid gap-3">
        <MenuLink href="/tournaments/new" title="Create tournament" detail="Eight short steps" />
        <MenuLink href="/teams" title="Teams and players" detail="Add, edit, or move a player" />
        <MenuLink href="/matches" title="Start a match" detail="Open a fixture and tap Start match" />
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">My team</h2>
        <div className="mt-3 grid gap-2">
          {state.teams.map((team) => {
            const active = state.myTeamId === team.id;
            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMyTeam(active ? null : team.id)}
                className={
                  active
                    ? "min-h-14 rounded-xl bg-primary px-4 text-left text-label-lg text-on-primary"
                    : "min-h-14 rounded-xl bg-surface-container-lowest px-4 text-left text-label-lg shadow-sm"
                }
              >
                {team.name}
                <span className="mt-0.5 block text-sm font-medium opacity-80">{team.city}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <h2 className="text-lg font-semibold">How Futty works</h2>
        <p className="mt-2 text-base leading-6 text-muted">
          Organizers build a tournament, start the match, and record goals from large buttons.
          Spectators open the same tournament link for the score, table, and bracket. Match
          records are stored in the Futty database.
        </p>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 min-h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-label-lg"
      >
        Sign out
      </button>
      <button
        type="button"
        onClick={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          reset();
          setConfirmReset(false);
        }}
        className="mt-8 min-h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-label-lg"
      >
        {confirmReset ? "Confirm reset to the sample cup" : "Reset sample data"}
      </button>
    </div>
  );
}

function MenuLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href} className="rounded-xl bg-surface-container-lowest px-4 py-4 shadow-sm">
      <span className="block text-lg font-semibold">{title}</span>
      <span className="block text-base text-muted">{detail}</span>
    </Link>
  );
}
