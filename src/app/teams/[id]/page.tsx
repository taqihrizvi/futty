import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamScreen } from "@/components/team-screen";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-lg">Loading team…</p>}>
      <TeamLoader params={params} />
    </Suspense>
  );
}

async function TeamLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeamScreen teamId={id} />;
}
