import type { Metadata } from "next";
import { PublicTournaments } from "@/components/public-tournaments";

export const metadata: Metadata = { title: "Tournaments" };

export default function WatchTournamentsPage() {
  return <PublicTournaments />;
}
