"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { EVENT_LABELS, type EventName } from "@/lib/telemetry-events";
import { InstitutionsPanel } from "./institutions-panel";
import { JobsPanel } from "./jobs-panel";

const TABS = [
  { id: "stats", label: "Statistics" },
  { id: "institutions", label: "Institutions" },
  { id: "jobs", label: "Jobs" },
] as const;
type Tab = (typeof TABS)[number]["id"];

interface Stats {
  days: number;
  since: string;
  daily: { day: string; views: number; visitors: number; checks: number }[];
  totals: Partial<Record<EventName, number>>;
  pages: { path: string; views: number; visitors: number }[];
  breakdown: { name: EventName; props: Record<string, string | number>; count: number }[];
  records: { accounts: number; outcomes: number; alerts: number };
}

type State = { kind: "loading" } | { kind: "login"; error?: string } | { kind: "disabled"; error: string } | { kind: "ready"; stats: Stats };

const fmt = (v: number) => v.toLocaleString("en-GB");

async function fetchStats(days: number): Promise<State> {
  const res = await fetch(`/api/admin/stats?days=${days}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) return { kind: "disabled", error: data.error };
  if (res.status === 401) return { kind: "login" };
  if (res.ok) return { kind: "ready", stats: data };
  return { kind: "login", error: data.error ?? "Could not load statistics" };
}

export function AdminClient() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [days, setDays] = useState(30);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("stats");
  const [pending, setPending] = useState(false);

  const load = useCallback(async (d: number) => setState(await fetchStats(d)), []);

  useEffect(() => {
    let cancelled = false;
    fetchStats(days).then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: password }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setPassword("");
    if (res.ok) load(days);
    else if (res.status === 403) setState({ kind: "disabled", error: data.error });
    else setState({ kind: "login", error: data.error ?? "Could not sign in" });
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setState({ kind: "login" });
  };

  if (state.kind === "loading") return <div className="card h-64 animate-pulse" />;
  if (state.kind === "disabled") return <div className="card max-w-lg text-muted">{state.error}</div>;
  if (state.kind === "login") {
    return (
      <form onSubmit={login} className="card max-w-sm space-y-3">
        <label className="label" htmlFor="admin-pw">Admin password</label>
        <input id="admin-pw" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Sign in</button>
      </form>
    );
  }

  const s = state.stats;
  const t = (k: EventName) => s.totals[k] ?? 0;
  const views = t("pageview");
  const avgVisitors = s.daily.length ? Math.round(s.daily.reduce((a, d) => a + d.visitors, 0) / s.daily.length) : 0;
  const maxViews = Math.max(1, ...s.daily.map((d) => d.views));
  const tiles: [string, number][] = [
    ["Page views", views],
    ["Avg. daily visitors", avgVisitors],
    ["Admission checks", t("check_results")],
    ["Results imported", t("result_import")],
    ["Donation clicks", t("donate_click")],
    ["Support clicks", t("support_click")],
    ["Accounts (all time)", s.records.accounts],
    ["Outcomes reported (all time)", s.records.outcomes],
  ];

  const tabBar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3" role="tablist">
      {TABS.map((x) => (
        <button key={x.id} role="tab" aria-selected={tab === x.id} className={`chip !px-4 !py-2 !text-sm ${tab === x.id ? "chip-active" : ""}`} onClick={() => setTab(x.id)}>
          {x.label}
          {x.id === "jobs" && pending && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-accent" aria-label="changes waiting" />}
        </button>
      ))}
      <button className="btn-ghost ml-auto !py-1.5" onClick={logout}><LogOut size={15} /> Sign out</button>
    </div>
  );

  if (tab === "institutions") return <div className="space-y-6">{tabBar}<InstitutionsPanel onPending={setPending} /></div>;
  if (tab === "jobs") return <div className="space-y-6">{tabBar}<JobsPanel /></div>;

  return (
    <div className="space-y-6">
      {tabBar}
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90, 365].map((d) => (
          <button key={d} className={`chip !py-1.5 ${days === d ? "chip-active" : ""}`} onClick={() => setDays(d)}>
            {d === 365 ? "12 months" : `${d} days`}
          </button>
        ))}
        <button className="btn-ghost ml-auto !py-1.5" onClick={() => load(days)}><RefreshCw size={15} /> Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="card !p-4">
            <div className="text-2xl font-bold">{fmt(value)}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Daily traffic since {s.since}</h2>
        {s.daily.length === 0 ? (
          <p className="text-sm text-muted">No visits recorded yet.</p>
        ) : (
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr><th className="py-2">Day</th><th>Page views</th><th className="text-right">Visitors</th><th className="text-right">Checks</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...s.daily].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="py-2 font-mono text-xs">{d.day}</td>
                  <td className="w-1/2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-brand" style={{ width: `${(d.views / maxViews) * 100}%`, minWidth: d.views ? 4 : 0 }} />
                      <span className="text-xs text-muted">{fmt(d.views)}</span>
                    </div>
                  </td>
                  <td className="text-right">{fmt(d.visitors)}</td>
                  <td className="text-right">{fmt(d.checks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Top pages</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {s.pages.map((p) => (
                <tr key={p.path}>
                  <td className="truncate py-2 font-mono text-xs">{p.path || "/"}</td>
                  <td className="text-right">{fmt(p.views)}</td>
                  <td className="w-20 text-right text-xs text-muted">{fmt(p.visitors)} vis.</td>
                </tr>
              ))}
              {s.pages.length === 0 && <tr><td className="py-2 text-muted">No data yet.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">Actions</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {(Object.keys(EVENT_LABELS) as EventName[]).filter((k) => k !== "pageview").map((k) => (
                <tr key={k}>
                  <td className="py-2">{EVENT_LABELS[k]}</td>
                  <td className="text-right font-semibold">{fmt(t(k))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Details</h2>
        <p className="mb-3 text-xs text-muted">Aggregate bands, exam types, import methods, donation buttons and support channels.</p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {s.breakdown.map((b, i) => (
              <tr key={i}>
                <td className="py-2">{EVENT_LABELS[b.name] ?? b.name}</td>
                <td className="text-xs text-muted">{Object.entries(b.props).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ")}</td>
                <td className="text-right font-semibold">{fmt(b.count)}</td>
              </tr>
            ))}
            {s.breakdown.length === 0 && <tr><td className="py-2 text-muted">No data yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-muted">Visitors are counted per day with an anonymous ID that changes daily, so a returning visitor counts once per day they visit.</p>
    </div>
  );
}
