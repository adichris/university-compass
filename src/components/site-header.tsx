"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Compass, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "./auth";
import { SITE } from "@/lib/site";

export const NAV = [
  { href: "/check", label: "Admission checker" },
  { href: "/results", label: "WASSCE results" },
  { href: "/postgraduate", label: "Masters & PhD" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/universities", label: "Universities" },
  { href: "/plan", label: "My plan" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="gh-stripe h-1" aria-hidden />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white dark:text-[#06140c]">
            <Compass size={20} />
          </span>
          <span>
            {SITE.name}<span className="text-accent">{SITE.suffix}</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-surface-2 ${
                pathname.startsWith(n.href) ? "text-brand" : "text-muted"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/account"
          className="ml-auto hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2 sm:flex xl:ml-2"
        >
          <UserRound size={16} />
          {user ? (user.name?.split(" ")[0] ?? "Account") : "Sign in"}
        </Link>
        <button
          className="ml-auto rounded-lg p-2 hover:bg-surface-2 sm:ml-0 xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-4 pb-4 xl:hidden">
          {[...NAV, { href: "/account", label: user ? "Account" : "Sign in (optional)" }].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 text-base font-medium ${pathname.startsWith(n.href) ? "text-brand" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
