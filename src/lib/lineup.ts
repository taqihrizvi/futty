import type { Match, MatchEvent } from "./types";

export function sideSize(format: string) {
  if (format === "11v11") return 11;
  if (format === "7v7") return 7;
  if (format === "6v6") return 6;
  return 5;
}

export function starterIds(match: Match, teamId: string) {
  if (teamId === match.homeTeamId) return match.homeStarterIds ?? [];
  if (teamId === match.awayTeamId) return match.awayStarterIds ?? [];
  return [];
}

export function hasLineup(match: Match) {
  return (match.homeStarterIds?.length ?? 0) > 0 || (match.awayStarterIds?.length ?? 0) > 0;
}

export function isSentOff(events: MatchEvent[], playerId: string) {
  let yellows = 0;
  for (const event of events) {
    if (event.kind !== "card" || event.playerId !== playerId) continue;
    if (event.cardColor === "red") return true;
    if (event.cardColor === "yellow") {
      yellows += 1;
      if (yellows >= 2) return true;
    }
  }
  return false;
}

export function onPitchIds(starters: string[], events: MatchEvent[], teamId: string) {
  const on = new Set(starters);
  const seen: MatchEvent[] = [];
  for (const event of events) {
    seen.push(event);
    if (event.teamId !== teamId) continue;
    if (event.kind === "substitution") {
      on.delete(event.playerId);
      if (event.relatedPlayerId && !isSentOff(seen, event.relatedPlayerId)) on.add(event.relatedPlayerId);
    } else if (event.kind === "card" && isSentOff(seen, event.playerId)) {
      on.delete(event.playerId);
    }
  }
  return on;
}
