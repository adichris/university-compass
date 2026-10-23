"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { disableSync, enableSync } from "@/lib/store";

export interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async ({ user }) => {
        setUser(user);
        if (user) await enableSync();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { ok, data } = await post("/api/auth/login", { email, password });
    if (!ok) return data.error ?? "Could not sign in";
    setUser(data.user);
    await enableSync();
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { ok, data } = await post("/api/auth/register", { email, password, name });
    if (!ok) return data.error ?? "Could not create account";
    setUser(data.user);
    await enableSync();
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await post("/api/auth/logout");
    disableSync();
    setUser(null);
  }, []);

  return <AuthContext value={{ user, loading, signIn, register, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
