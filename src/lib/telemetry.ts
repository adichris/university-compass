"use client";

import type { EventName, EventProps } from "./telemetry-events";

/** Visitors who ask not to be tracked (Do Not Track / Global Privacy Control) send nothing. */
function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/** Record an anonymous statistic. Never throws and never blocks the page. */
export function track(name: EventName, props?: EventProps) {
  try {
    if (typeof window === "undefined" || optedOut()) return;
    const body = JSON.stringify({ name, path: window.location.pathname, props });
    if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) {
      fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Statistics are best-effort.
  }
}
