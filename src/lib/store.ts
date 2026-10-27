"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Local-first persistence. Everything lives in localStorage so the app works
 * fully without an account; when a user signs in, keys are mirrored to /api/sync.
 */

type Entry<T> = { v: T; t: number };

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();
let syncEnabled = false;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readEntry<T>(key: string): Entry<T> | null {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as Entry<T> | null;
  let value: Entry<T> | null = null;
  if (raw) {
    try {
      value = JSON.parse(raw) as Entry<T>;
    } catch {
      value = null;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function writeEntry<T>(key: string, entry: Entry<T>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Private mode / quota: keep working in memory for this session.
    cache.set(key, { raw: JSON.stringify(entry), value: entry });
  }
  listeners.forEach((l) => l());
}

function pushToServer(key: string, entry: Entry<unknown>) {
  if (!syncEnabled) return;
  clearTimeout(pending.get(key));
  pending.set(
    key,
    setTimeout(() => {
      fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: entry.v, t: entry.t }),
      }).catch(() => {});
    }, 600),
  );
}

export function setPersisted<T>(key: string, value: T) {
  const entry = { v: value, t: Date.now() };
  writeEntry(key, entry);
  pushToServer(key, entry);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key?.startsWith("uc:") && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersisted<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const entry = useSyncExternalStore(
    subscribe,
    () => readEntry<T>(key),
    () => undefined,
  );
  const hydrated = entry !== undefined;
  const value = entry ? entry.v : initial;
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readEntry<T>(key)?.v ?? initial;
      setPersisted(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set, hydrated];
}

/** Called after sign-in: merge server and local copies (newest wins both ways). */
export async function enableSync(): Promise<void> {
  syncEnabled = true;
  const res = await fetch("/api/sync");
  if (!res.ok) return;
  const { data } = (await res.json()) as { data: Record<string, Entry<unknown>> };
  const localKeys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("uc:")) localKeys.push(k);
    }
  } catch {}
  for (const key of new Set([...Object.keys(data), ...localKeys])) {
    const local = readEntry<unknown>(key);
    const remote = data[key];
    if (remote && (!local || remote.t > local.t)) writeEntry(key, remote);
    else if (local && (!remote || local.t > remote.t)) pushToServer(key, local);
  }
}

export function disableSync() {
  syncEnabled = false;
}

export const KEYS = {
  sittings: "uc:sittings",
  savedProgrammes: "uc:saved-programmes",
  savedScholarships: "uc:saved-scholarships",
  tracker: "uc:tracker",
  pgProfile: "uc:pg-profile",
  resultCheck: "uc:result-check",
  filters: "uc:check-filters",
  career: "uc:career",
  recField: "uc:rec-field",
} as const;
