"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/watch/matches", label: "Matches" },
  { href: "/watch/tournaments", label: "Cups" },
  { href: "/watch/stats", label: "Stats" },
] as const;

function selected(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/watch";
  if (href === "/watch/tournaments") {
    return pathname === "/watch/tournaments" || /^\/watch\/(?!matches$|stats$|tournaments$)[^/]+$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-container-lowest/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2">
          <Link href="/" className="shrink-0">
            <img src="/logo.png" alt="Contour Arena" width={1774} height={887} className="h-10 w-auto" />
          </Link>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Public">
            {TABS.map((item) => {
              const on = selected(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`shrink-0 rounded-lg px-3 py-2 text-label-md ${on ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/login" className="shrink-0 rounded-lg bg-primary px-3 py-2 text-label-md text-on-primary">
            Sign in
          </Link>
        </div>
      </header>
      <main className="overflow-x-clip px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
