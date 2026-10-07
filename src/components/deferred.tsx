"use client";

import { useEffect, useState } from "react";

export function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return now;
}

export function Deferred({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!node || show) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShow(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, show]);

  return (
    <div ref={setNode}>
      {show ? children : <div className="h-24" aria-hidden />}
    </div>
  );
}
