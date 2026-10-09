import type { Metadata } from "next";
import { PublicTournament } from "@/components/public-tournament";

export const metadata: Metadata = { title: "Tournament" };

export default async function WatchTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicTournament slug={slug} />;
}
