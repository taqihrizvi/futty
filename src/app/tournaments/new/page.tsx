import type { Metadata } from "next";
import { Suspense } from "react";
import { WizardScreen } from "@/components/wizard";

export const metadata: Metadata = { title: "Create tournament" };

export default function NewTournamentPage() {
  return (
    <Suspense fallback={<p className="text-lg">Loading the wizard…</p>}>
      <WizardScreen />
    </Suspense>
  );
}
