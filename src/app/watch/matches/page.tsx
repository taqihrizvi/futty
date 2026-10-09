import type { Metadata } from "next";
import { PublicMatches } from "@/components/public-matches";

export const metadata: Metadata = { title: "Matches" };

export default function WatchMatchesPage() {
  return <PublicMatches />;
}
