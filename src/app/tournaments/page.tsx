import type { Metadata } from "next";
import { TournamentsScreen } from "@/components/tournaments-screen";

export const metadata: Metadata = { title: "Tournaments" };

export default function TournamentsPage() {
  return <TournamentsScreen />;
}
