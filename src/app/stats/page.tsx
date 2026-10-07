import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsScreen } from "@/components/stats-screen";

export const metadata: Metadata = { title: "Statistics" };

export default function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-lg">Loading statistics…</p>}>
      <StatsLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function StatsLoader({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string }>;
}) {
  const { metric } = await searchParams;
  return <StatsScreen initialMetric={metric} />;
}
