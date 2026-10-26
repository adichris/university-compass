import { spawn } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { JOBS_DIR, LOCAL_DIR, PROJECT_ROOT, readJson, readOverrides, readText, writeJson } from "@/lib/admin-files";
import { requireAdmin } from "@/lib/admin";
import { overridesBuiltAt } from "@/lib/data";

const JOBS = {
  gtec: "Refresh GTEC data and rebuild",
  apply: "Apply changes (rebuild)",
  deploy: "Deploy latest code from GitHub",
} as const;
type JobName = keyof typeof JOBS;

interface JobMeta {
  id: string;
  job: JobName;
  pid: number;
  startedAt: string;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function jobStatus(meta: JobMeta) {
  const exitText = readText(join(JOBS_DIR, `${meta.id}.exit`)).trim();
  const exitCode = exitText === "" ? null : Number(exitText);
  const status = exitCode === null ? (alive(meta.pid) ? "running" : "stopped") : exitCode === 0 ? "success" : "failed";
  return { ...meta, label: JOBS[meta.job], status, exitCode };
}

function listJobs() {
  mkdirSync(JOBS_DIR, { recursive: true });
  return readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<JobMeta | null>(join(JOBS_DIR, f), null))
    .filter((m): m is JobMeta => Boolean(m))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 15)
    .map(jobStatus);
}

function tail(text: string, lines: number) {
  return text.split("\n").slice(-lines).join("\n");
}

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  const jobs = listJobs();
  const selected = (id && jobs.find((j) => j.id === id)) || jobs[0];
  return Response.json({
    available: JOBS,
    jobs,
    log: selected ? { id: selected.id, text: tail(readText(join(JOBS_DIR, `${selected.id}.log`)), 400) } : null,
    lastBuild: readText(join(LOCAL_DIR, "last-build.txt")).trim() || null,
    overridesSavedAt: readOverrides().updatedAt,
    overridesBuiltAt,
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const job = String(body?.job ?? "") as JobName;
  if (!(job in JOBS)) return Response.json({ error: "Unknown job" }, { status: 400 });
  if (listJobs().some((j) => j.status === "running")) {
    return Response.json({ error: "Another job is still running. Wait for it to finish." }, { status: 409 });
  }

  const id = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(JOBS_DIR, { recursive: true });
  const base = `data/local/jobs/${id}`;
  // Detached so the job survives the site restart it triggers. The shell writes its own log and exit
  // code (passing file handles to a detached process is unreliable on some platforms).
  // The running server keeps its compiled config in __NEXT_* variables; a build that inherited them would
  // ignore next.config.ts and build into (and first delete) the live .next folder.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("__NEXT"))) as NodeJS.ProcessEnv;
  const child = spawn("bash", ["-c", `bash scripts/admin-job.sh ${job} > "${base}.log" 2>&1; echo $? > "${base}.exit"`], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: "ignore",
    env,
  });
  child.unref();
  writeJson(join(JOBS_DIR, `${id}.json`), { id, job, pid: child.pid ?? 0, startedAt: new Date().toISOString() });
  return Response.json({ ok: true, id });
}
