"use client";

import { useSyncExternalStore } from "react";

let selectedId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setCupId(id: string) {
  if (selectedId === id) return;
  selectedId = id;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCupId() {
  return useSyncExternalStore(
    subscribe,
    () => selectedId,
    () => null,
  );
}
