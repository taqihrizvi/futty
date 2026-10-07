"use client";

import { useEffect, useRef } from "react";

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[85dvh] w-full overflow-y-auto rounded-t-xl bg-surface-container-lowest px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-xl sm:pb-5"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-outline-variant" />
        <h2 className="text-headline-md">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
