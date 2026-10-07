import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayerScreen } from "@/components/player-screen";

export const metadata: Metadata = { title: "Player" };

export default function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-lg">Loading player…</p>}>
      <PlayerLoader params={params} />
    </Suspense>
  );
}

async function PlayerLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerScreen playerId={id} />;
}
