"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { formatLabel } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Format, Tournament } from "@/lib/types";

const FORMATS: { id: Format; label: string }[] = [
  { id: "5v5", label: "5v5" },
  { id: "6v6", label: "6-a-side" },
  { id: "7v7", label: "7v7" },
  { id: "11v11", label: "11v11" },
];

export function TournamentEditor({
  tournament,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) {
  const { updateTournament } = useApp();
  const [name, setName] = useState(tournament.name);
  const [city, setCity] = useState(tournament.city);
  const [venue, setVenue] = useState(tournament.venue);
  const [format, setFormat] = useState<Format>(tournament.format);
  const [startLabel, setStartLabel] = useState(tournament.startLabel);
  const [endLabel, setEndLabel] = useState(tournament.endLabel);
  const [error, setError] = useState("");

  return (
    <BottomSheet title="Edit tournament" onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setError("Add a tournament name.");
            return;
          }
          updateTournament(tournament.id, {
            name,
            city,
            venue,
            format,
            startLabel,
            endLabel,
          });
          onClose();
        }}
      >
        <Field label="Name" value={name} onChange={setName} />
        <Field label="City" value={city} onChange={setCity} />
        <Field label="Venue" value={venue} onChange={setVenue} />
        <Field label="Starts" value={startLabel} onChange={setStartLabel} />
        <Field label="Ends" value={endLabel} onChange={setEndLabel} />
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={
                format === item.id
                  ? "min-h-12 rounded-2xl bg-accent px-3 text-base font-semibold text-accent-ink"
                  : "min-h-12 rounded-2xl bg-pitch-2 px-3 text-base font-semibold"
              }
            >
              {formatLabel(item.id)}
            </button>
          ))}
        </div>
        {error ? <p className="text-base font-semibold text-error">{error}</p> : null}
        <button
          type="submit"
          className="min-h-14 rounded-2xl bg-primary px-4 text-lg font-semibold text-on-primary"
        >
          Save tournament
        </button>
      </form>
    </BottomSheet>
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
