"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppNav, NavFallback } from "@/components/app-nav";
import { AppProvider, DataGate } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return children;

  return (
    <AppProvider>
      <Suspense fallback={<NavFallback />}>
        <AppNav />
      </Suspense>
      <main className="min-h-dvh px-4 pt-20 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pr-8 lg:pb-10 lg:pl-72">
        <DataGate>{children}</DataGate>
      </main>
    </AppProvider>
  );
}
