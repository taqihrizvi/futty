import type { RoundId } from "./types";

export function dayLabel(offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (offset < 0) return `${Math.abs(offset)} days ago`;
  return `In ${offset} days`;
}

export const REGULATION_SECONDS = 15 * 60;
export const ADDED_TIME_SECONDS = 2 * 60;
export const HALF_LIMIT_SECONDS = REGULATION_SECONDS + ADDED_TIME_SECONDS;

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function periodClock(totalSeconds: number) {
  const safe = Math.min(HALF_LIMIT_SECONDS, Math.max(0, Math.floor(totalSeconds)));
  if (safe <= REGULATION_SECONDS) return formatClock(safe);
  return `15:00 + ${formatClock(safe - REGULATION_SECONDS)}`;
}

export function formatGd(gd: number) {
  if (gd > 0) return `+${gd}`;
  return String(gd);
}

export function roundLabel(round: RoundId | undefined) {
  if (round === "quarter-final") return "Quarter-final";
  if (round === "semi-final") return "Semi-final";
  if (round === "final") return "Final";
  return "Knockout";
}

export function kickoffSortKey(dayOffset: number, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  return dayOffset * 24 * 60 + hours * 60 + minutes;
}

export function elapsedSeconds(
  match: {
    clockSeconds: number;
    clockRunning: boolean;
    clockAnchor: string | null;
  },
  now: number | null,
) {
  if (!match.clockRunning || !match.clockAnchor || now == null) {
    return match.clockSeconds;
  }
  const delta = Math.floor((now - Date.parse(match.clockAnchor)) / 1000);
  return Math.min(HALF_LIMIT_SECONDS, match.clockSeconds + Math.max(0, delta));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function dayOffsetFromDate(dateStr: string) {
  const target = new Date(`${dateStr}T12:00:00`);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
}

export function formatMetric(metric: string, value: number) {
  if (metric === "rating") return value.toFixed(1);
  return String(value);
}
