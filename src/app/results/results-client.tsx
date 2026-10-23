"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bell, Camera, Check, ClipboardPaste, Copy, ExternalLink, Loader2, Lock, ShieldCheck } from "lucide-react";
import { newSitting } from "@/components/grade-editor";
import { subjects, updates } from "@/lib/data";
import { WASSCE_GRADES } from "@/lib/grades";
import { parseResultText } from "@/lib/parse-results";
import { KEYS, usePersisted } from "@/lib/store";
import type { ExamType, Sitting } from "@/lib/types";

export const WAEC_PORTAL = "https://ghana.waecdirect.org";
const THIS_YEAR = new Date().getFullYear();

interface Remembered {
  exam: Exclude<ExamType, "sssce">;
  year: number;
  index: string;
}

export function ResultsClient() {
  return (
    <div className="space-y-10">
      <GuidedCheck />
      <ImportResults />
      <ReleaseWatch />
    </div>
  );
}

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-left text-sm disabled:opacity-50"
    >
      <span className="text-muted">{label}</span>
      <span className={`flex items-center gap-2 font-semibold ${mono ? "font-mono" : ""}`}>
        {value || "--"} {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} className="text-muted" />}
      </span>
    </button>
  );
}

function GuidedCheck() {
  const [saved, setSaved, hydrated] = usePersisted<Remembered | null>(KEYS.resultCheck, null);
  // Mount the form once localStorage is readable so remembered details pre-fill it.
  if (!hydrated) return <div className="h-[520px] animate-pulse rounded-2xl bg-surface-2" />;
  return <GuidedCheckForm saved={saved} setSaved={setSaved} />;
}

function GuidedCheckForm({ saved, setSaved }: { saved: Remembered | null; setSaved: (v: Remembered | null) => void }) {
  const [exam, setExam] = useState<Remembered["exam"]>(saved?.exam ?? "wassce");
  const [year, setYear] = useState(saved?.year ?? THIS_YEAR);
  const [index, setIndex] = useState(saved?.index ?? "");
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(Boolean(saved));

  const indexOk = /^\d{10}$/.test(index);
  const examName = exam === "wassce" ? "WASSCE SCHOOL CANDIDATES" : "WASSCE PRIVATE CANDIDATES";

  const open = () => {
    if (remember) setSaved({ exam, year, index });
    else if (saved) setSaved(null);
    window.open(WAEC_PORTAL, "_blank", "noopener");
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">1. Check your result on the WAEC portal</h2>
          <p className="mt-1 text-sm text-muted">
            Fill in your details here once. We keep them ready to copy into the official portal, so you don&apos;t mistype your index number.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rc-exam">Examination</label>
            <select id="rc-exam" className="input" value={exam} onChange={(e) => setExam(e.target.value as Remembered["exam"])}>
              <option value="wassce">WASSCE School (May/June)</option>
              <option value="novdec">WASSCE Private (Nov/Dec)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rc-year">Exam year</label>
            <select id="rc-year" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => THIS_YEAR - i).map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="rc-index">Index number</label>
          <input
            id="rc-index"
            className="input font-mono tracking-wider"
            inputMode="numeric"
            placeholder="10 digits, e.g. 0123456789"
            maxLength={12}
            value={index}
            onChange={(e) => setIndex(e.target.value.replace(/\D/g, ""))}
          />
          {index && !indexOk && <p className="mt-1 text-xs text-[var(--reach)]">WASSCE index numbers are usually 10 digits - double-check it on your admission card.</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rc-serial">Checker card serial</label>
            <input id="rc-serial" className="input font-mono uppercase" autoComplete="off" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase().trim())} />
          </div>
          <div>
            <label className="label" htmlFor="rc-pin">Checker PIN</label>
            <input id="rc-pin" className="input font-mono" autoComplete="off" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.trim())} />
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <Lock size={14} className="mt-0.5 shrink-0" />
          Your serial and PIN stay in this browser tab only. They are never saved or sent to our servers.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember my exam, year and index number on this device
        </label>
        <button className="btn-primary w-full" onClick={open}>
          Open the official WAEC results portal <ExternalLink size={16} />
        </button>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold">Copy into the portal, step by step</h3>
        <ol className="space-y-3 text-sm">
          <li>
            <p className="mb-1.5 text-muted">a. Choose the examination type and year</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <CopyField label="Type" value={examName} mono={false} />
              <CopyField label="Year" value={String(year)} />
            </div>
          </li>
          <li>
            <p className="mb-1.5 text-muted">b. Enter your index number</p>
            <CopyField label="Index" value={index} />
          </li>
          <li>
            <p className="mb-1.5 text-muted">c. Enter the serial number and PIN from your checker card</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <CopyField label="Serial" value={serial} />
              <CopyField label="PIN" value={pin ? "•".repeat(Math.min(pin.length, 12)) : ""} />
            </div>
            {pin && (
              <button className="mt-1 text-xs font-medium text-brand" onClick={() => navigator.clipboard.writeText(pin)}>
                Copy PIN
              </button>
            )}
          </li>
          <li className="text-muted">d. Complete the security check on the portal and submit. Then come back and import your grades below.</li>
        </ol>
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><ShieldCheck size={16} className="text-brand" /> Where to get a results checker card</p>
          <p className="mt-1 text-muted">
            Buy only from WAEC offices or WAEC-authorised sellers (including WAEC&apos;s official e-voucher channels). Each card can only be used a
            few times, so keep it safe. Never pay anyone who offers to &quot;upgrade&quot; or change grades - that is fraud.
          </p>
          <a href="https://www.waecgh.org" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            WAEC Ghana official site <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ImportResults() {
  const router = useRouter();
  const [, setSittings] = usePersisted<Sitting[]>(KEYS.sittings, []);
  const [mode, setMode] = useState<"paste" | "scan">("paste");
  const [text, setText] = useState("");
  const [grades, setGrades] = useState<Record<string, string> | null>(null);
  const [exam, setExam] = useState<"wassce" | "novdec">("wassce");
  const [year, setYear] = useState(THIS_YEAR);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = (raw: string) => {
    const { grades: found } = parseResultText(raw);
    if (Object.keys(found).length === 0) {
      setError("We couldn't find any subjects and grades. Try copying the whole results table, or enter them manually.");
      setGrades(null);
    } else {
      setError(null);
      setGrades(found);
    }
  };

  const scan = async (file: File) => {
    setBusy("Loading text recogniser…");
    setError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && setBusy(`Reading your slip… ${Math.round(m.progress * 100)}%`),
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(data.text);
      parse(data.text);
    } catch {
      setError("Couldn't read that image. Try a clearer, well-lit photo, or paste the text instead.");
    } finally {
      setBusy(null);
    }
  };

  const save = (mode: "add" | "replace") => {
    if (!grades) return;
    const sitting: Sitting = { ...newSitting(exam), year, grades };
    setSittings((prev) => (mode === "replace" ? [sitting] : [...prev, sitting]));
    router.push("/check");
  };

  const order = [...subjects.core, ...Object.keys(grades ?? {}).filter((s) => !subjects.core.includes(s))];

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">2. Import your grades automatically</h2>
        <p className="mt-1 text-sm text-muted">
          After checking, copy the results table from the WAEC page and paste it here, or snap a photo of your printed result slip.
          Your grades are filled in automatically and checked against every programme.
        </p>
      </div>
      <div className="flex gap-2">
        <button className={`chip !py-2 ${mode === "paste" ? "chip-active" : ""}`} onClick={() => setMode("paste")}>
          <ClipboardPaste size={14} /> Paste results text
        </button>
        <button className={`chip !py-2 ${mode === "scan" ? "chip-active" : ""}`} onClick={() => setMode("scan")}>
          <Camera size={14} /> Scan slip / screenshot
        </button>
        <Link href="/check" className="chip !py-2 hover:text-brand">Enter manually</Link>
      </div>

      {mode === "paste" ? (
        <div className="space-y-3">
          <textarea
            className="input min-h-40 font-mono text-xs"
            placeholder={"ENGLISH LANG          B3\nMATHEMATICS(CORE)     C4\nINTEGRATED SCIENCE    B2\n..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Pasted results"
          />
          <button className="btn-primary" disabled={!text.trim()} onClick={() => parse(text)}>Read my grades</button>
        </div>
      ) : (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && scan(e.target.files[0])} />
          <button className="btn-ghost w-full border-dashed !py-8" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy ? <><Loader2 className="animate-spin" size={18} /> {busy}</> : <><Camera size={18} /> Take a photo or choose an image</>}
          </button>
          <p className="text-xs text-muted">Text recognition runs on your phone or computer - the image is not uploaded to us.</p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {grades && (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <p className="font-medium">Check these grades, fix anything we misread, then continue.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={exam} onChange={(e) => setExam(e.target.value as "wassce" | "novdec")} aria-label="Exam">
              <option value="wassce">WASSCE School (May/June)</option>
              <option value="novdec">WASSCE Private (NOVDEC)</option>
            </select>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {Array.from({ length: 12 }, (_, i) => THIS_YEAR - i).map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {order.map((s) => (
              <div key={s} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/60 p-2 pl-3 text-sm">
                <span className={grades[s] ? "" : "text-muted"}>{s}</span>
                <select
                  className="input w-20 !py-1.5 text-center font-mono"
                  value={grades[s] ?? ""}
                  aria-label={`${s} grade`}
                  onChange={(e) => {
                    const next = { ...grades };
                    if (e.target.value) next[s] = e.target.value;
                    else delete next[s];
                    setGrades(next);
                  }}
                >
                  <option value="">--</option>
                  {WASSCE_GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => save("replace")}>Use these grades & see my chances</button>
            <button className="btn-ghost" onClick={() => save("add")}>Add as an extra sitting</button>
          </div>
        </div>
      )}
    </section>
  );
}

function ReleaseWatch() {
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<string[]>(["results", "admissions"]);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | string>("idle");
  const results = updates.filter((u) => u.kind === "results");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, topics }) });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? "done" : (data.error ?? "Something went wrong"));
  };

  return (
    <section id="alerts" className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="text-lg font-semibold">Results release tracker</h2>
        <ul className="mt-3 space-y-3">
          {results.map((u) => (
            <li key={u.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{u.title}</p>
                <p className="text-muted">{u.window}</p>
                {u.note && <p className="mt-1 text-xs text-muted">{u.note}</p>}
              </div>
              <span className={`chip shrink-0 capitalize ${u.status === "released" ? "chip-active" : ""}`}>{u.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <form className="card space-y-3" onSubmit={subscribe}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell size={18} /> Get a free alert</h2>
        <p className="text-sm text-muted">We&apos;ll email you when results are released or admission forms open. No account needed; unsubscribe any time.</p>
        <input className="input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <div className="flex flex-wrap gap-2">
          {[["results", "WASSCE results"], ["admissions", "Admission forms"], ["scholarships", "Scholarship deadlines"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip !py-1.5 ${topics.includes(id) ? "chip-active" : ""}`}
              onClick={() => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn-primary" disabled={status === "busy" || !topics.length}>{status === "done" ? "Subscribed ✓" : "Notify me"}</button>
        {status !== "idle" && status !== "busy" && status !== "done" && <p className="text-sm text-danger">{status}</p>}
      </form>
    </section>
  );
}
