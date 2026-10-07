"use client";

import Link from "next/link";
import { teamById } from "@/lib/derive";
import { formatGd } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { StandingRow } from "@/lib/types";

export function Standings({
  rows,
  showTable,
}: {
  rows: StandingRow[];
  showTable?: boolean;
}) {
  const { state } = useApp();
  if (rows.length === 0) {
    return <p className="text-base text-muted">No group matches yet.</p>;
  }

  return (
    <>
      <div className={showTable ? "space-y-3 lg:hidden" : "space-y-3"}>
        {rows.map((row) => {
          const team = teamById(state, row.teamId);
          return (
            <article key={row.teamId} className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold">
                  <span className="mr-2 text-gold">{row.rank}</span>
                  {team ? (
                    <Link href={`/teams/${team.id}`} className="underline-offset-2">
                      {team.name}
                    </Link>
                  ) : (
                    "Team"
                  )}
                </h3>
                <p className="text-lg font-semibold tabular-nums">{row.points} pts</p>
              </div>
              <p className="mt-2 text-base">{row.played} played</p>
              <p className="text-base">
                W {row.won} · D {row.drawn} · L {row.lost}
              </p>
              <p className="text-base">
                GF {row.gf} · GA {row.ga} · GD {formatGd(row.gd)}
              </p>
              {row.qualification ? (
                <p className="mt-3 inline-flex min-h-8 items-center rounded-full bg-primary-fixed px-3 text-label-sm text-on-primary-fixed">
                  {row.qualification}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      {showTable ? (
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[40rem] border-separate border-spacing-y-2 text-left text-body-sm">
            <thead className="text-label-sm text-outline uppercase">
              <tr>
                <th className="px-3 font-semibold">#</th>
                <th className="px-3 font-semibold">Team</th>
                <th className="px-3 font-semibold">P</th>
                <th className="px-3 font-semibold">W</th>
                <th className="px-3 font-semibold">D</th>
                <th className="px-3 font-semibold">L</th>
                <th className="px-3 font-semibold">GF</th>
                <th className="px-3 font-semibold">GA</th>
                <th className="px-3 font-semibold">GD</th>
                <th className="px-3 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const team = teamById(state, row.teamId);
                return (
                  <tr key={row.teamId} className="bg-surface-container-lowest shadow-sm">
                    <td className="rounded-l-xl px-3 py-3 font-semibold">{row.rank}</td>
                    <td className="px-3 py-3 font-semibold">
                      {team?.name ?? "Team"}
                      {row.qualification ? (
                        <span className="ml-2 text-label-sm text-primary">
                          {row.qualification}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{row.played}</td>
                    <td className="px-3 py-3 tabular-nums">{row.won}</td>
                    <td className="px-3 py-3 tabular-nums">{row.drawn}</td>
                    <td className="px-3 py-3 tabular-nums">{row.lost}</td>
                    <td className="px-3 py-3 tabular-nums">{row.gf}</td>
                    <td className="px-3 py-3 tabular-nums">{row.ga}</td>
                    <td className="px-3 py-3 tabular-nums">{formatGd(row.gd)}</td>
                    <td className="rounded-r-xl px-3 py-3 font-semibold tabular-nums">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
