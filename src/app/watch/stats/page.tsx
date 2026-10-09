import type { Metadata } from "next";
import { PublicStats } from "@/components/public-stats";

export const metadata: Metadata = { title: "Stats" };

export default function WatchStatsPage() {
  return <PublicStats />;
}
