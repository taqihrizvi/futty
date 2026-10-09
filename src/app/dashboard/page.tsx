import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";

export const metadata: Metadata = { title: "Desk" };

export default function DashboardPage() {
  return <HomeScreen />;
}
