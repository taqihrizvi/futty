import type { Metadata } from "next";
import { Suspense } from "react";
import { TournamentScreen } from "@/components/tournament-screen";

export const metadata: Metadata = { title: "Tournament" };

export default function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-lg">Loading tournament…</p>}>
      <TournamentLoader params={params} />
    </Suspense>
  );
}

async function TournamentLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TournamentScreen slug={slug} />;
}
