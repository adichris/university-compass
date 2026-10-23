"use client";

import { Plus, Trash2 } from "lucide-react";
import { allElectives, subjects } from "@/lib/data";
import { EXAM_LABELS, gradesFor } from "@/lib/grades";
import type { ExamType, Sitting } from "@/lib/types";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 25 }, (_, i) => THIS_YEAR - i);

export function newSitting(exam: ExamType = "wassce"): Sitting {
  return { id: Math.random().toString(36).slice(2, 9), exam, year: exam === "sssce" ? 2005 : THIS_YEAR, grades: {} };
}

export function GradeEditor({ sitting, onChange }: { sitting: Sitting; onChange: (s: Sitting) => void }) {
  const scale = gradesFor(sitting.exam);
  const electives = Object.keys(sitting.grades).filter((s) => !subjects.core.includes(s));
  // Electives being chosen but not yet graded are kept with an empty grade.
  const setGrade = (subject: string, grade: string) => onChange({ ...sitting, grades: { ...sitting.grades, [subject]: grade } });
  const remove = (subject: string) => {
    const next = { ...sitting.grades };
    delete next[subject];
    onChange({ ...sitting, grades: next });
  };
  const renameElective = (from: string, to: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(sitting.grades)) next[k === from ? to : k] = v;
    onChange({ ...sitting, grades: next });
  };
  const applyTrack = (track: string) => {
    const core = Object.fromEntries(subjects.core.map((s) => [s, sitting.grades[s] ?? ""]));
    const picks = subjects.tracks[track].slice(0, 4);
    onChange({ ...sitting, grades: { ...core, ...Object.fromEntries(picks.map((s) => [s, sitting.grades[s] ?? ""])) } });
  };
  const unused = allElectives.filter((s) => !(s in sitting.grades));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`exam-${sitting.id}`}>Exam</label>
          <select
            id={`exam-${sitting.id}`}
            className="input"
            value={sitting.exam}
            onChange={(e) => onChange({ ...sitting, exam: e.target.value as ExamType, grades: Object.fromEntries(Object.keys(sitting.grades).map((k) => [k, ""])) })}
          >
            {(Object.keys(EXAM_LABELS) as ExamType[]).map((e) => (
              <option key={e} value={e}>{EXAM_LABELS[e]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`year-${sitting.id}`}>Year</label>
          <select id={`year-${sitting.id}`} className="input" value={sitting.year} onChange={(e) => onChange({ ...sitting, year: Number(e.target.value) })}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div>
        <p className="label">Quick start: your SHS programme</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(subjects.tracks).map((t) => (
            <button key={t} type="button" className="chip hover:border-brand hover:text-brand" onClick={() => applyTrack(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="label">Core subjects</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {subjects.core.map((s) => (
            <GradeRow key={s} subject={s} grade={sitting.grades[s] ?? ""} scale={scale} onGrade={(g) => setGrade(s, g)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Elective subjects</legend>
        <div className="grid gap-2">
          {electives.map((s) => (
            <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 p-2">
              <select className="input min-w-0 flex-1 !py-2" value={s} aria-label="Elective subject" onChange={(e) => renameElective(s, e.target.value)}>
                <option value={s}>{s}</option>
                {unused.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <GradeSelect grade={sitting.grades[s]} scale={scale} label={`${s} grade`} onGrade={(g) => setGrade(s, g)} />
              <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-danger" aria-label={`Remove ${s}`} onClick={() => remove(s)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {unused.length > 0 && electives.length < 8 && (
          <button type="button" className="btn-ghost mt-3" onClick={() => setGrade(unused[0], "")}>
            <Plus size={16} /> Add elective
          </button>
        )}
      </fieldset>
    </div>
  );
}

function GradeRow({ subject, grade, scale, onGrade }: { subject: string; grade: string; scale: readonly string[]; onGrade: (g: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/60 p-2 pl-3">
      <span className="text-sm font-medium">{subject}</span>
      <GradeSelect grade={grade} scale={scale} label={`${subject} grade`} onGrade={onGrade} />
    </div>
  );
}

function GradeSelect({ grade, scale, label, onGrade }: { grade: string; scale: readonly string[]; label: string; onGrade: (g: string) => void }) {
  return (
    <select
      aria-label={label}
      className={`input w-20 shrink-0 !py-2 text-center font-mono font-semibold ${grade ? "" : "text-muted"}`}
      value={grade}
      onChange={(e) => onGrade(e.target.value)}
    >
      <option value="">--</option>
      {scale.map((g) => <option key={g}>{g}</option>)}
    </select>
  );
}

/** Drop empty grades before checking. */
export function cleanSittings(sittings: Sitting[]): Sitting[] {
  return sittings.map((s) => ({ ...s, grades: Object.fromEntries(Object.entries(s.grades).filter(([, g]) => g)) }));
}
