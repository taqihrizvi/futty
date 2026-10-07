import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Futty",
    short_name: "Futty",
    description:
      "Mobile-first futsal tournaments, live scoring, standings, and player stats.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07140f",
    theme_color: "#07140f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
