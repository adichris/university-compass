"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";

interface Job {
  id: string;
  job: string;
  label: string;
  startedAt: string;
  status: "running" | "success" | "failed" | "stopped";
  exitCode: number | null;
}

interface JobsData {
  available: Record<string, string>;
  jobs: Job[];
  log: { id: string; text: string } | null;
  lastBuild: string | null;
  overridesSavedAt: string | null;
  overridesBuiltAt: string | null;
}

const JOB_HELP: Record<string, string> = {
  apply: "Rebuilds the site with your saved edits. Takes a few minutes; the site keeps running and restarts at the end.",
  gtec: "Re-crawls GTEC's register of accredited institutions and programmes (30-40 minutes), then rebuilds.",
  deploy: "Pulls the latest code from GitHub and rebuilds - the same as running the deploy script over SSH.",
};

const STATUS_STYLE: Record<Job["status"], string> = {
  running: "text-[var(--competitive)]",
  success: "text-[var(--safe)]",
  failed: "text-danger",
  stopped: "text-muted",
};

async function fetchJobs(id?: string): Promise<JobsData | string> {
  const res = await fetch(`/api/admin/jobs${id ? `?id=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : (data.error ?? "Could not load jobs");
}

export function JobsPanel() {
  const [data, setData] = useState<JobsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | undefined>();

  const refresh = useCallback(async (id?: string) => {
    const result = await fetchJobs(id);
    if (typeof result === "string") setError(result);
    else {
      setError(null);
      setData(result);
    }
  }, []);

  const running = data?.jobs.some((j) => j.status === "running") ?? false;

  useEffect(() => {
    let cancelled = false;
    const tick = () => fetchJobs(selected).then((r) => {
      if (cancelled) return;
      if (typeof r === "string") setError(r);
      else setData(r);
    });
    tick();
    // Poll while a job runs so the log updates live.
    const timer = running ? setInterval(tick, 3000) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [selected, running]);

  const start = async (job: string) => {
    if (!confirm(`${data?.available[job]}?\n\n${JOB_HELP[job] ?? ""}`)) return;
    const res = await fetch("/api/admin/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Could not start the job");
    else {
      setSelected(body.id);
      refresh(body.id);
    }
  };

  if (!data) return <div className="card h-40 animate-pulse">{error && <p className="text-danger">{error}</p>}</div>;
  const pending = Boolean(data.overridesSavedAt && data.overridesSavedAt !== data.overridesBuiltAt);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(data.available).map(([job, label]) => (
          <div key={job} className="card flex flex-col gap-3 !p-4">
            <div>
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-muted">{JOB_HELP[job]}</p>
            </div>
            <button className="btn-primary mt-auto" disabled={running} onClick={() => start(job)}>
              <Play size={15} /> Run
            </button>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted">
        Last successful build: {data.lastBuild ? new Date(data.lastBuild).toLocaleString() : "not recorded yet"}.
        {pending && <strong className="text-foreground"> You have saved edits waiting for &quot;Apply changes&quot;.</strong>}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <section className="card h-fit !p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="font-semibold">Recent jobs</h3>
            <button className="text-muted hover:text-foreground" onClick={() => refresh(selected)} aria-label="Refresh"><RefreshCw size={15} /></button>
          </div>
          <ul className="divide-y divide-border">
            {data.jobs.map((j) => (
              <li key={j.id}>
                <button className={`w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2 ${data.log?.id === j.id ? "bg-brand-soft" : ""}`} onClick={() => setSelected(j.id)}>
                  <span className="block font-medium">{j.label}</span>
                  <span className="text-xs text-muted">{new Date(j.startedAt).toLocaleString()} · <span className={STATUS_STYLE[j.status]}>{j.status}</span></span>
                </button>
              </li>
            ))}
            {data.jobs.length === 0 && <li className="px-2 py-2 text-sm text-muted">No jobs run yet.</li>}
          </ul>
        </section>
        <section className="card min-w-0 !p-3">
          <h3 className="mb-2 px-1 font-semibold">Log {running && <span className="text-xs font-normal text-muted">(updating live)</span>}</h3>
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg bg-[#0d0f1c] p-3 font-mono text-xs leading-relaxed text-[#d7d9ea]">
            {data.log?.text || "Select a job to see its output."}
          </pre>
        </section>
      </div>
    </div>
  );
}
