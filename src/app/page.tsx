import type { Metadata } from "next";
import { PublicHome } from "@/components/public-home";

export const metadata: Metadata = { title: { absolute: "Contour Arena" } };

export default function HomePage() {
  return <PublicHome />;
}
