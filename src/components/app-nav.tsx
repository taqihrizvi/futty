"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { displayNameFromEmail } from "@/lib/display-name";
import { signOut } from "@/lib/sign-out";
import { useApp } from "@/lib/store";

const ITEMS = [
  { href: "/", label: "Home", icon: "grid_view" },
  { href: "/tournaments", label: "Tournaments", icon: "emoji_events" },
  { href: "/matches", label: "Matches", icon: "sports" },
  { href: "/stats", label: "Statistics", icon: "bar_chart" },
  { href: "/teams", label: "Teams & Squads", icon: "groups" },
];

const MANAGE = [
  { href: "/tournaments/new", label: "Create Tournament", icon: "add_circle" },
  { href: "/more", label: "Settings", icon: "settings" },
];

const MOBILE = [
  { href: "/", label: "Home", icon: "grid_view" },
  { href: "/tournaments", label: "Cups", icon: "emoji_events" },
  { href: "/matches", label: "Matches", icon: "sports" },
  { href: "/stats", label: "Stats", icon: "bar_chart" },
  { href: "/more", label: "More", icon: "more_horiz" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/tournaments") {
    return pathname === "/tournaments" || /^\/tournaments\/(?!new(?:\/|$))/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const { state } = useApp();
  const liveCount = state.matches.filter((match) => match.status === "live").length;
  const tournamentName = state.tournaments[0]?.name ?? "City Futsal Cup";
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { name: string; email: string };
      })
      .then((next) => {
        if (!cancelled) setAccount(next);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const username = account ? displayNameFromEmail(account.email) : "Organizer";

  const linkClass = (href: string) =>
    active(pathname, href)
      ? "flex items-center gap-3 rounded-lg bg-primary-container px-4 py-2.5 font-bold text-on-primary"
      : "flex items-center gap-3 rounded-lg px-4 py-2.5 text-label-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

  return (
    <>
      <aside className="fixed top-0 left-0 z-50 hidden h-full w-64 flex-col border-r border-line bg-surface-container-lowest lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary">
            <Icon name="sports_soccer" className="text-[20px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-md tracking-tight">Futty</span>
            <span className="text-label-sm text-outline uppercase">Tournament OS</span>
          </div>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-label-sm tracking-wider text-on-surface-variant uppercase">
                Circuit Active
              </span>
            </div>
            <span className="text-label-sm font-semibold text-primary">PRO LEAGUE</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
          {ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <Icon name={item.icon} className="text-[20px]" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-4 pb-1">
            <p className="px-4 text-label-sm tracking-wider text-outline uppercase">Management</p>
          </div>
          {MANAGE.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <Icon name={item.icon} className="text-[20px]" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="m-4 flex items-center justify-between rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Icon name="person" className="text-[18px] text-on-primary" />
            </div>
            <div className="flex flex-col truncate">
              <span className="truncate text-label-md font-semibold">{username}</span>
              <span className="truncate text-label-sm text-outline">{account?.email ?? "Signed in"}</span>
            </div>
          </div>
          <button type="button" aria-label="Sign out" onClick={signOut}>
            <Icon name="logout" className="text-[18px] text-on-surface-variant" />
          </button>
        </div>
      </aside>
      <header className="fixed top-0 right-0 left-0 z-40 border-b border-line bg-surface-container-lowest/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:left-64">
        <div className="flex h-14 items-center justify-between gap-2 px-3 lg:h-16 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary">
              <Icon name="sports_soccer" className="text-[20px]" />
            </span>
            <span className="truncate text-headline-md tracking-tight">Futty</span>
          </Link>
          <div className="hidden items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5 text-label-md text-on-surface sm:flex">
            <Icon name="military_tech" className="text-[18px] text-primary" />
            <span className="max-w-40 truncate font-semibold">{tournamentName}</span>
            <Icon name="expand_more" className="text-[16px] text-outline" />
          </div>
          <div className="relative hidden max-w-xl flex-1 md:block">
            <Icon name="search" className="absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline" />
            <input
              className="h-10 w-full rounded-lg bg-surface-container-low pr-4 pl-9 text-body-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/20 focus:outline-none"
              placeholder="Search fixtures, squads, courts, stats..."
              type="text"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-surface-container px-2 py-1 text-label-sm text-primary">
            <span className="h-2 w-2 animate-ping rounded-full bg-error" />
            <span className="font-bold uppercase">{liveCount} live</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Icon name="person" className="text-[18px] text-on-primary" />
            </div>
            <div className="hidden flex-col text-left md:flex">
              <span className="text-label-md leading-none font-semibold">{username}</span>
              <span className="mt-0.5 text-label-sm leading-none text-outline">
                {account?.email ?? "Signed in"}
              </span>
            </div>
          </div>
        </div>
        </div>
      </header>
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-line bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid h-16 grid-cols-5">
          {MOBILE.map((item) => {
            const on = active(pathname, item.href);
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 ${on ? "text-primary" : "text-on-surface-variant"}`}
                >
                  <Icon name={item.icon} className="text-[22px]" />
                  <span className="text-center text-[11px] leading-none font-semibold">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function NavFallback() {
  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-40 h-[calc(3.5rem+env(safe-area-inset-top))] border-b border-line bg-surface-container-lowest lg:left-64 lg:h-16" />
      <div className="fixed right-0 bottom-0 left-0 z-40 h-16 border-t border-line bg-surface-container-lowest lg:hidden" />
    </>
  );
}
