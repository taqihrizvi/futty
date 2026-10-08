import type { Metadata, Viewport } from "next";
import { Chivo, Hanken_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Contour Arena",
    template: "%s · Contour Arena",
  },
  description:
    "Corporate athletic futsal tournament manager for live scoring, standings, and squads.",
  applicationName: "Contour Arena",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Contour Arena",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f8f9ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${chivo.variable} ${hanken.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0&display=swap"
        />
      </head>
      <body className="min-h-dvh bg-background text-on-surface" suppressHydrationWarning>
        <Suspense fallback={<p className="px-4 pt-20 text-on-surface">Loading Contour Arena…</p>}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
