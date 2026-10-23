"use client";

import { useMemo, useState } from "react";
import { programmes, universities, universityBySlug } from "@/lib/data";

const THIS_YEAR = new Date().getFullYear();

export function ContributeClient() {
  const [uni, setUni] = useState(universities[0].slug);
  const options = useMemo(() => programmes.filter((p) => p.university === uni), [uni]);
  const [programmeId, setProgrammeId] = useState(options[0]?.id ?? "");
  const [aggregate, setAggregate] = useState("");
  const [year, setYear] = useState(THIS_YEAR);
  const [admitted, setAdmitted] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | string>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    const res = await fetch("/api/outcomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programmeId, aggregate: Number(aggregate), year, admitted }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? "done" : (data.error ?? "Something went wrong"));
  };

  if (status === "done") {
    return (
      <div className="card max-w-xl text-center">
        <p className="text-lg font-semibold">Thank you! 🎉</p>
        <p className="mt-2 text-muted">Your report helps next year&apos;s students see real cut-offs for {universityBySlug.get(uni)?.short}.</p>
        <button className="btn-ghost mt-4" onClick={() => { setStatus("idle"); setAggregate(""); setAdmitted(null); }}>Report another</button>
      </div>
    );
  }

  return (
    <form className="card max-w-xl space-y-4" onSubmit={submit}>
      <div>
        <label className="label" htmlFor="c-uni">University</label>
        <select id="c-uni" className="input" value={uni} onChange={(e) => { setUni(e.target.value); setProgrammeId(programmes.find((p) => p.university === e.target.value)?.id ?? ""); }}>
          {universities.map((u) => <option key={u.slug} value={u.slug}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="c-prog">Programme</label>
        <select id="c-prog" className="input" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-agg">Your aggregate</label>
          <input id="c-agg" className="input" type="number" min={6} max={54} required value={aggregate} onChange={(e) => setAggregate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="c-year">Admission year</label>
          <select id="c-year" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => THIS_YEAR - i).map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div>
        <p className="label">Outcome</p>
        <div className="flex gap-2">
          <button type="button" className={`chip !py-2 ${admitted === true ? "chip-active" : ""}`} onClick={() => setAdmitted(true)}>I was admitted</button>
          <button type="button" className={`chip !py-2 ${admitted === false ? "chip-active" : ""}`} onClick={() => setAdmitted(false)}>I wasn&apos;t admitted</button>
        </div>
      </div>
      <button className="btn-primary w-full" disabled={status === "busy" || admitted === null || !aggregate || !programmeId}>Submit anonymously</button>
      {status !== "idle" && status !== "busy" && <p className="text-sm text-danger">{status}</p>}
      <p className="text-xs text-muted">We store only the programme, aggregate, year and outcome - no name, email or index number.</p>
    </form>
  );
}
