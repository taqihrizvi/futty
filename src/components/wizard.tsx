"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { teamKey } from "@/lib/publish";
import { useApp } from "@/lib/store";
import type { Format, RoundId, Team } from "@/lib/types";

const STEPS = [
  "Tournament",
  "Teams",
  "Format",
  "Groups",
  "Qualification",
  "Knockout",
  "Review",
  "Publish",
] as const;

const FORMATS: { id: Format; label: string }[] = [
  { id: "5v5", label: "5v5" },
  { id: "6v6", label: "6-a-side" },
  { id: "7v7", label: "7v7" },
  { id: "11v11", label: "11v11" },
];
const ROUNDS: { id: RoundId; label: string }[] = [
  { id: "quarter-final", label: "Quarter-final" },
  { id: "semi-final", label: "Semi-final" },
  { id: "final", label: "Final" },
];

function todayInput() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function plusDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export function WizardScreen() {
  const { publish, state } = useApp();
  const router = useRouter();
  const initialDate = useMemo(() => todayInput(), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(plusDays(initialDate, 3));
  const [format, setFormat] = useState<Format>("5v5");
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teams, setTeams] = useState<{ name: string; city: string }[]>([]);
  const [groupCount, setGroupCount] = useState(2);
  const [qualify, setQualify] = useState(2);
  const [rounds, setRounds] = useState<RoundId[]>(["quarter-final", "semi-final", "final"]);
  const [error, setError] = useState("");

  const smallestGroup = Math.max(1, Math.floor(teams.length / Math.max(groupCount, 1)));

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function validate(index: number) {
    if (index === 0 && !name.trim()) return "Add a tournament name.";
    if (index === 0 && !city.trim()) return "Add a city.";
    if (index === 1 && teams.length < 2) return "Add at least two teams.";
    if (index === 4 && qualify < 1) return "At least one team must qualify from each group.";
    if (index === 5 && rounds.length === 0) return "Choose at least one knockout round.";
    return "";
  }

  function addTeam() {
    const name = teamName.trim().replace(/\s+/g, " ");
    if (!name) {
      setError("Enter a team name.");
      return;
    }
    if (teams.some((item) => teamKey(item.name) === teamKey(name))) {
      setError("That team is already in this tournament.");
      return;
    }
    setTeams((current) => [...current, { name, city: teamCity.trim() || city.trim() }]);
    setTeamName("");
    setTeamCity("");
    setError("");
  }

  function selectExisting(team: Team) {
    setTeams((current) => {
      if (current.some((item) => teamKey(item.name) === teamKey(team.name))) {
        return current.filter((item) => teamKey(item.name) !== teamKey(team.name));
      }
      return [...current, { name: team.name, city: team.city }];
    });
    setError("");
  }

  async function publishNow() {
    const problem = validate(0) || validate(1) || validate(5);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const slug = await publish({
        name,
        city,
        venue,
        startDate,
        endDate,
        format,
        teams,
        groupCount: Math.min(groupCount, teams.length),
        qualifyPerGroup: Math.min(qualify, smallestGroup),
        rounds,
      });
      router.push(`/tournaments/${slug}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Step ${step + 1} of ${STEPS.length}`}
        title={STEPS[step]}
        detail="Each step fits on a phone. You can go back without losing what you typed."
      />
      <ol className="mb-5 flex gap-1">
        {STEPS.map((label, index) => (
          <li key={label} className="min-w-0 flex-1">
            <div
              className={
                index <= step ? "h-2 rounded-full bg-accent" : "h-2 rounded-full bg-pitch-3"
              }
            />
            <span className="mt-1 block text-xs font-semibold text-muted">{index + 1}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-3">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Venue" value={venue} onChange={setVenue} />
          <label className="grid gap-1 text-base font-semibold">
            Starts
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="min-h-12 rounded-2xl bg-pitch-2 px-4 text-base"
            />
          </label>
          <label className="grid gap-1 text-base font-semibold">
            Ends
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="min-h-12 rounded-2xl bg-pitch-2 px-4 text-base"
            />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-3">
          {state.teams.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-base font-semibold">Existing teams</p>
              {state.teams.map((team) => {
                const selected = teams.some((item) => teamKey(item.name) === teamKey(team.name));
                return (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectExisting(team)}
                    className={
                      selected
                        ? "min-h-14 rounded-2xl bg-accent px-4 text-left text-lg font-semibold text-accent-ink"
                        : "min-h-14 rounded-2xl bg-pitch-2 px-4 text-left text-lg font-semibold"
                    }
                  >
                    {team.name}
                    {team.city ? <span className="block text-sm font-normal opacity-80">{team.city}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="text-base font-semibold">New team</p>
          <Field label="Team name" value={teamName} onChange={setTeamName} />
          <Field label="Team city" value={teamCity} onChange={setTeamCity} />
          <button
            type="button"
            onClick={addTeam}
            className="min-h-14 rounded-2xl bg-pitch-3 px-4 text-lg font-semibold"
          >
            Add team
          </button>
          <ul className="grid gap-2">
            {teams.map((team, index) => (
              <li
                key={`${team.name}-${index}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-pitch-2 px-4"
              >
                <span>
                  <span className="block text-lg font-semibold">{team.name}</span>
                  <span className="text-sm text-muted">{team.city || city}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTeams((current) => current.filter((_, item) => item !== index))
                  }
                  className="min-h-11 px-2 font-semibold text-live"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={
                format === item.id
                  ? "min-h-16 rounded-2xl bg-accent px-4 text-xl font-semibold text-accent-ink"
                  : "min-h-16 rounded-2xl bg-pitch-2 px-4 text-xl font-semibold"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <Stepper
          label="Number of groups"
          value={groupCount}
          min={1}
          max={Math.max(1, Math.min(4, teams.length))}
          onChange={setGroupCount}
          hint={groupsPreview(teams.map((team) => team.name), groupCount)}
        />
      ) : null}

      {step === 4 ? (
        <Stepper
          label="Teams that qualify from each group"
          value={qualify}
          min={1}
          max={Math.max(1, smallestGroup)}
          onChange={setQualify}
          hint={`The smallest group has ${smallestGroup} teams.`}
        />
      ) : null}

      {step === 5 ? (
        <div className="grid gap-3">
          {ROUNDS.map((round) => {
            const on = rounds.includes(round.id);
            return (
              <button
                key={round.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setRounds((current) =>
                    on ? current.filter((item) => item !== round.id) : [...current, round.id],
                  )
                }
                className={
                  on
                    ? "min-h-16 rounded-2xl bg-accent px-4 text-left text-xl font-semibold text-accent-ink"
                    : "min-h-16 rounded-2xl bg-pitch-2 px-4 text-left text-xl font-semibold"
                }
              >
                {round.label}
              </button>
            );
          })}
          <p className="text-base text-muted">
            Ties are created empty. Winners fill the next round when a match ends.
          </p>
        </div>
      ) : null}

      {step === 6 ? (
        <dl className="grid gap-3 rounded-2xl bg-pitch-2 p-4 text-base">
          <Row term="Tournament" value={name} />
          <Row term="Place" value={`${city}${venue ? ` · ${venue}` : ""}`} />
          <Row term="Format" value={FORMATS.find((item) => item.id === format)?.label ?? format} />
          <Row term="Teams" value={String(teams.length)} />
          <Row term="Groups" value={String(Math.min(groupCount, teams.length))} />
          <Row term="Qualify" value={`${qualify} per group`} />
          <Row term="Knockout" value={rounds.join(", ") || "None"} />
        </dl>
      ) : null}

      {step === 7 ? (
        <div className="grid gap-3">
          <p className="text-base leading-6 text-muted">
            Publishing saves this tournament on this phone and builds the group fixtures.
          </p>
          <button
            type="button"
            onClick={publishNow}
            className="min-h-16 rounded-2xl bg-accent px-4 text-xl font-semibold text-accent-ink"
          >
            Publish tournament
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-base font-semibold text-live">{error}</p> : null}

      {step < 7 ? (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 flex gap-3 border-t border-line bg-background/95 px-4 py-3 lg:bottom-0 lg:mx-0 lg:border-0 lg:px-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep((current) => current - 1);
              }}
              className="min-h-14 rounded-2xl bg-pitch-3 px-5 text-lg font-semibold"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={next}
            className="min-h-14 flex-1 rounded-2xl bg-accent px-4 text-lg font-semibold text-accent-ink"
          >
            {step === 6 ? "Continue" : "Next"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-base font-semibold">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl bg-pitch-2 px-4 text-base font-normal"
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint: string;
}) {
  const shown = Math.min(Math.max(value, min), max);
  return (
    <div>
      <p className="text-lg font-semibold">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, shown - 1))}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-pitch-3 text-2xl font-semibold"
        >
          −
        </button>
        <p className="min-w-12 text-center text-3xl font-semibold tabular-nums">{shown}</p>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, shown + 1))}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-pitch-3 text-2xl font-semibold"
        >
          +
        </button>
      </div>
      <p className="mt-3 text-base text-muted">{hint}</p>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted">{term}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}

function groupsPreview(names: string[], count: number) {
  if (names.length === 0) return "Add teams first.";
  const groups = Array.from({ length: Math.max(1, count) }, () => [] as string[]);
  names.forEach((item, index) => {
    groups[index % groups.length].push(item);
  });
  return groups
    .map((group, index) => `Group ${String.fromCharCode(65 + index)}: ${group.join(", ") || "—"}`)
    .join(" · ");
}
