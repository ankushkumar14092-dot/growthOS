"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** Defer analytics so first paint is not blocked by the API round-trip. */
export function VisitorTracker({ path }: { path: string }) {
  useEffect(() => {
    const run = () => trackEvent("visitor", { path });
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [path]);

  return null;
}
