import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveMatchScreen } from "@/components/live-match";

export const metadata: Metadata = { title: "Live match" };

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-lg">Loading match…</p>}>
      <MatchLoader params={params} />
    </Suspense>
  );
}

async function MatchLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveMatchScreen matchId={id} />;
}
