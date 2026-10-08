import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";

export const metadata: Metadata = { title: { absolute: "Contour Arena" } };

export default function HomePage() {
  return <HomeScreen />;
}
