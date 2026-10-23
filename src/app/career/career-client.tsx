"use client";

import Link from "next/link";
import { useState } from "react";
import { FIELD_LABELS, programmeTemplates } from "@/lib/data";
import type { Field } from "@/lib/types";

const QUESTIONS: { q: string; options: { label: string; fields: Field[] }[] }[] = [
  {
    q: "Which school subjects do you enjoy most?",
    options: [
      { label: "Biology & Chemistry", fields: ["health", "science", "agriculture"] },
      { label: "Maths & Physics", fields: ["engineering", "science"] },
      { label: "Economics, Accounting & Business", fields: ["business"] },
      { label: "Literature, History & Government", fields: ["law", "humanities", "social-science"] },
      { label: "Art, Design & Textiles", fields: ["arts"] },
      { label: "Practical / technical subjects", fields: ["technical", "engineering"] },
    ],
  },
  {
    q: "What kind of work sounds most exciting?",
    options: [
      { label: "Caring for sick people", fields: ["health"] },
      { label: "Building things or solving technical problems", fields: ["engineering", "technical"] },
      { label: "Writing code and working with data", fields: ["science"] },
      { label: "Running a business or managing money", fields: ["business"] },
      { label: "Arguing a case, debating, influencing policy", fields: ["law", "social-science"] },
      { label: "Teaching and mentoring young people", fields: ["education"] },
    ],
  },
  {
    q: "Where would you like to work?",
    options: [
      { label: "Hospital or clinic", fields: ["health"] },
      { label: "Site, factory, mine or lab", fields: ["engineering", "science", "technical"] },
      { label: "Office, bank or company", fields: ["business", "law"] },
      { label: "Farm, forest or outdoors", fields: ["agriculture"] },
      { label: "Classroom or community", fields: ["education", "social-science"] },
      { label: "Studio, media house or my own creative brand", fields: ["arts", "humanities"] },
    ],
  },
  {
    q: "How do you prefer to solve problems?",
    options: [
      { label: "With numbers and logic", fields: ["science", "engineering", "business"] },
      { label: "By talking to and understanding people", fields: ["social-science", "education", "health"] },
      { label: "With my hands", fields: ["technical", "arts", "agriculture"] },
      { label: "By reading, writing and researching", fields: ["humanities", "law"] },
    ],
  },
  {
    q: "How long are you happy to study?",
    options: [
      { label: "As long as it takes (6+ years)", fields: ["health", "law"] },
      { label: "A standard 4-year degree", fields: ["engineering", "science", "business", "social-science", "humanities", "education", "agriculture", "arts"] },
      { label: "Get to work faster (2-3 years, HND/diploma)", fields: ["technical", "education"] },
    ],
  },
];

export function CareerClient() {
  const [answers, setAnswers] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const done = answers.every((a) => a !== null);

  const scores = new Map<Field, number>();
  answers.forEach((a, qi) => {
    if (a === null) return;
    for (const f of QUESTIONS[qi].options[a].fields) scores.set(f, (scores.get(f) ?? 0) + 1);
  });
  const top = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {QUESTIONS.map((q, qi) => (
          <fieldset key={q.q} className="card">
            <legend className="sr-only">{q.q}</legend>
            <p className="mb-3 font-semibold">{qi + 1}. {q.q}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, oi) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={answers[qi] === oi}
                  onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${answers[qi] === oi ? "border-brand bg-brand-soft font-medium text-brand" : "border-border hover:bg-surface-2"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <aside className="card h-fit lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Your best-fit fields</h2>
        {!done && <p className="mt-2 text-sm text-muted">Answer all {QUESTIONS.length} questions ({answers.filter((a) => a !== null).length} done).</p>}
        {top.length > 0 && (
          <ol className="mt-4 space-y-4">
            {top.map(([field], i) => {
              const examples = Object.values(programmeTemplates).filter((t) => t.field === field).slice(0, 4);
              return (
                <li key={field}>
                  <p className="font-semibold">{i + 1}. {FIELD_LABELS[field]}</p>
                  <p className="text-sm text-muted">{examples.map((e) => e.name).join(" · ")}</p>
                  <Link href={`/check?field=${field}`} className="text-sm font-semibold text-brand">See programmes I qualify for →</Link>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-6 text-xs text-muted">This quiz is a starting point, not a verdict. Talk to your school counsellor and people working in the field.</p>
      </aside>
    </div>
  );
}
