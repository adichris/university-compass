"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth";

export function AccountClient() {
  const { user, loading, signIn, register, signOut } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="card h-64 max-w-md animate-pulse" />;

  if (user) {
    return (
      <div className="card max-w-md space-y-4">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="text-brand" size={20} /> Signed in as {user.name ?? user.email}</p>
        <p className="text-sm text-muted">Your grades, saved programmes, scholarships and application tracker now sync across all your devices.</p>
        <div className="flex gap-2">
          <Link href="/plan" className="btn-primary">Go to my plan</Link>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(mode === "signin" ? await signIn(email, password) : await register(email, password, name));
    setBusy(false);
  };

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <form className="card space-y-4" onSubmit={submit}>
        <div className="flex gap-2">
          <button type="button" className={`chip !py-2 ${mode === "signin" ? "chip-active" : ""}`} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={`chip !py-2 ${mode === "register" ? "chip-active" : ""}`} onClick={() => setMode("register")}>Create account</button>
        </div>
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="a-name">Name (optional)</label>
            <input id="a-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="a-email">Email</label>
          <input id="a-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="a-pw">Password</label>
          <input id="a-pw" className="input" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{mode === "signin" ? "Sign in" : "Create free account"}</button>
      </form>
      <div className="card space-y-3 text-sm">
        <p className="font-semibold">An account is completely optional</p>
        <p className="text-muted">Every feature works without signing in - your data is saved in this browser. An account only adds:</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Sync across your phone, laptop and the school computer</li>
          <li>A backup if you clear your browser</li>
          <li>Anything you saved before signing in is merged in automatically</li>
        </ul>
        <p className="text-muted">We never sell your data or share your results.</p>
      </div>
    </div>
  );
}
