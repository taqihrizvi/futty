import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchesScreen } from "@/components/matches-screen";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <Suspense fallback={<p className="text-lg">Loading matches…</p>}>
      <MatchesScreen />
    </Suspense>
  );
}
