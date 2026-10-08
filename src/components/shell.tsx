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
      <main className="min-h-dvh overflow-x-clip px-4 pt-[calc(4.25rem+env(safe-area-inset-top))] pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pr-8 lg:pb-10 lg:pl-72 lg:pt-20">
        <DataGate>{children}</DataGate>
      </main>
    </AppProvider>
  );
}
