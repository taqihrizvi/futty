import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Contour Arena",
    short_name: "Contour Arena",
    description:
      "Mobile-first futsal tournaments, live scoring, standings, and player stats.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#113d8d",
    icons: [
      {
        src: "/logo.png",
        sizes: "1774x887",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
