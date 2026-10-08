"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/match-card";
import { Chip, EmptyNote, PageHeader } from "@/components/ui";
import { sortedMatches } from "@/lib/derive";
import { useApp } from "@/lib/store";
import type { Match } from "@/lib/types";

const FILTERS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "my-team", label: "My team" },
  { id: "group", label: "Group" },
  { id: "knockout", label: "Knockout" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const PAGE = 6;

export function MatchesScreen() {
  const { state } = useApp();
  const [filter, setFilter] = useState<FilterId>("today");
  const [visible, setVisible] = useState(PAGE);

  const matches = useMemo(() => {
    const mine = state.myTeamId;
    const filtered = state.matches.filter((match) => matchesFilter(match, filter, mine));
    return sortedMatches(filtered);
  }, [filter, state.matches, state.myTeamId]);

  const shown = matches.slice(0, visible);

  return (
    <div>
      <PageHeader title="Matches" detail="Fixtures, live games, and results." />
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-1">
        {FILTERS.map((item) => (
          <Chip
            key={item.id}
            active={filter === item.id}
            className="w-full shrink px-1"
            onClick={() => {
              setFilter(item.id);
              setVisible(PAGE);
            }}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      {filter === "my-team" && !state.myTeamId ? (
        <EmptyNote>Choose your team under More to use this filter.</EmptyNote>
      ) : shown.length === 0 ? (
        <EmptyNote>No matches in this filter.</EmptyNote>
      ) : (
        <div className="grid gap-3">
          {shown.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
      {visible < matches.length ? (
        <button
          type="button"
          onClick={() => setVisible((count) => count + PAGE)}
          className="mt-4 min-h-14 w-full rounded-xl bg-surface-container-lowest text-label-lg shadow-sm"
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}

function matchesFilter(match: Match, filter: FilterId, myTeamId: string | null) {
  if (filter === "today") return match.dayOffset === 0;
  if (filter === "upcoming") return match.status === "scheduled";
  if (filter === "completed") return match.status === "finished";
  if (filter === "group") return match.stage === "group";
  if (filter === "knockout") return match.stage === "knockout";
  if (!myTeamId) return false;
  return match.homeTeamId === myTeamId || match.awayTeamId === myTeamId;
}
