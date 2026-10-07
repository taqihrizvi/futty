import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { MatchesScreen } from "@/components/matches-screen";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <Suspense fallback={<Loader />}>
      <MatchesScreen />
    </Suspense>
  );
}
