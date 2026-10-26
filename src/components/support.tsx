"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Copy, HeartHandshake, LifeBuoy, Mail, Phone, Send, ShieldAlert, X } from "lucide-react";
import { hasContact, hasDonations, SITE, SUPPORT } from "@/lib/site";

const telegramId = SUPPORT.telegram.replace(/^@/, "").replace(/\s+/g, "");
const telegramIsPhone = telegramId.startsWith("+");
// t.me/+<number> opens a chat with that phone number; usernames use t.me/<name>.
const telegramUrl = telegramId ? `https://t.me/${telegramId}` : "";
const telegramLabel = telegramIsPhone ? telegramId.replace(/^\+233(\d{2})(\d{3})(\d{4})$/, "+233 $1 $2 $3") : `@${telegramId}`;
const mailUrl = SUPPORT.email ? `mailto:${SUPPORT.email}?subject=${encodeURIComponent(`${SITE.name} support`)}` : "";
// "#" must be encoded or the dialer drops it.
const MOMO_DIAL = "tel:*170%23";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost !py-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(value.replace(/\s+/g, "")).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={15} className="text-brand" /> : <Copy size={15} />} {copied ? "Copied" : label}
    </button>
  );
}

export function DonateCard() {
  if (!hasDonations) return null;
  const { number, name, merchantId } = SUPPORT.momo;
  return (
    <section className="card space-y-4" id="donate">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <HeartHandshake size={22} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Support {SITE.name} with MTN MoMo</h2>
          <p className="text-sm text-muted">
            {SITE.name} is free for every student. Donations pay for hosting and keeping admission data up to date. Any
            amount helps, even GHS 5.
          </p>
        </div>
      </div>

      {number && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">MoMo number</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{number}</p>
          {name && <p className="text-sm text-muted">Name: <span className="font-semibold text-foreground">{name}</span></p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={number} label="Copy number" />
            <a href={MOMO_DIAL} className="btn-primary !py-1.5">
              <Phone size={15} /> Dial *170#
            </a>
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Dial <strong className="text-foreground">*170#</strong> and choose <strong className="text-foreground">Transfer Money</strong>, then <strong className="text-foreground">MoMo User</strong>.</li>
            <li>Enter the number above and check the name{name ? ` shows ${name}` : ""}.</li>
            <li>Enter the amount, use <strong className="text-foreground">{SITE.name}</strong> as the reference, and confirm with your PIN.</li>
          </ol>
        </div>
      )}

      {merchantId && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">MoMoPay merchant ID</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{merchantId}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={merchantId} label="Copy merchant ID" />
            {!number && (
              <a href={MOMO_DIAL} className="btn-primary !py-1.5">
                <Phone size={15} /> Dial *170#
              </a>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">Dial *170#, choose <strong className="text-foreground">MoMoPay &amp; Pay Bill</strong>, then <strong className="text-foreground">MoMoPay</strong>, and enter the merchant ID.</p>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        Only send to the {number ? "number" : "merchant ID"} shown on this page. We will never call or message you to ask for your MoMo PIN or a
        payment.
      </p>
    </section>
  );
}

export function ContactCard() {
  if (!hasContact) return null;
  return (
    <section className="card space-y-4" id="contact">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <LifeBuoy size={22} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="text-sm text-muted">
            Questions about your grades, a programme&apos;s requirements or using the site? Reach our support line.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {telegramUrl && (
          <a href={telegramUrl} target="_blank" rel="noreferrer" className="btn-primary justify-start !py-3">
            <Send size={18} /> Chat on Telegram <span className="ml-auto font-normal opacity-80">{telegramLabel}</span>
          </a>
        )}
        {mailUrl && (
          <a href={mailUrl} className="btn-ghost justify-start !py-3">
            <Mail size={18} /> Email us <span className="ml-auto truncate font-normal text-muted">{SUPPORT.email}</span>
          </a>
        )}
      </div>
      {SUPPORT.telegramQr && telegramUrl && (
        <div className="hidden items-center gap-4 rounded-xl border border-border bg-surface-2/60 p-3 sm:flex">
          <Image src={SUPPORT.telegramQr} alt={`Telegram QR code for ${telegramLabel}`} width={140} height={147} className="rounded-lg" />
          <p className="text-sm text-muted">
            On a computer? Scan this with your phone&apos;s camera or the Telegram app to start a chat with our support line.
          </p>
        </div>
      )}
      {SUPPORT.hours && <p className="text-xs text-muted">We usually reply {SUPPORT.hours}.</p>}
    </section>
  );
}

/** Floating "Help" button on every page, opening the support options. */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  if (!hasContact && !hasDonations) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="card w-64 space-y-2 !p-3 shadow-lg" role="dialog" aria-label="Help and support">
          <p className="px-1 text-sm font-semibold">How can we help?</p>
          {telegramUrl && (
            <a href={telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              <Send size={16} className="text-brand" /> Telegram support
            </a>
          )}
          {mailUrl && (
            <a href={mailUrl} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              <Mail size={16} className="text-brand" /> Email support
            </a>
          )}
          {hasDonations && (
            <Link href="/support#donate" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              <HeartHandshake size={16} className="text-accent" /> Donate with MoMo
            </Link>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Help and support"}
        className="btn-primary !rounded-full !px-4 !py-3 shadow-lg"
      >
        {open ? <X size={18} /> : <LifeBuoy size={18} />} {open ? "Close" : "Help"}
      </button>
    </div>
  );
}
