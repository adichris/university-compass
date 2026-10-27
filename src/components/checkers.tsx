"use client";

import { useState } from "react";
import { BookOpen, Check, Copy, GraduationCap, MessageSquare, Phone, Share2, Smartphone } from "lucide-react";
import { CHECKERS, hasCheckerSales } from "@/lib/site";
import { track } from "@/lib/telemetry";

// "#" must be encoded or the phone's dialer drops it.
const dialHref = `tel:${CHECKERS.ussd.replace(/#/g, "%23")}`;
const shareText =
  `Buy a genuine WASSCE (GH₵ ${CHECKERS.prices.WASSCE}) or BECE (GH₵ ${CHECKERS.prices.BECE}) results checker: ` +
  `dial ${CHECKERS.ussd} and enter vendor code ${CHECKERS.vendorCode}. Pay with MoMo and get your serial and PIN instantly.`;

const EXAMS = [
  { key: "WASSCE", label: "WASSCE", sub: "Senior high", Icon: GraduationCap, tone: "bg-[#0b7a43] text-white" },
  { key: "BECE", label: "BECE", sub: "Junior high", Icon: BookOpen, tone: "bg-[#f2a516] text-[#1d1600]" },
] as const;

/**
 * Exam badge (site-designed, deliberately not WAEC's trademarked logo, so the site isn't mistaken
 * for an official WAEC page).
 */
function ExamBadge({ exam, size = "md", onDark = false }: { exam: (typeof EXAMS)[number]; size?: "sm" | "md"; onDark?: boolean }) {
  const { Icon } = exam;
  const price = CHECKERS.prices[exam.key];
  const logo = CHECKERS.examLogo;
  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-semibold ${onDark ? "bg-white/15" : "bg-surface-2"}`}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-5 w-5 rounded-full bg-white object-contain p-0.5" />
        ) : (
          <span className={`grid h-5 w-5 place-items-center rounded-full ${exam.tone}`}><Icon size={12} aria-hidden /></span>
        )}
        {exam.label} · GH₵ {price}
      </span>
    );
  }
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3 ${onDark ? "bg-white/10" : "bg-surface-2/70"}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={`${exam.label} (WAEC)`} className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm" />
      ) : (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-sm ${exam.tone}`}><Icon size={22} aria-hidden /></span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block text-base font-bold tracking-wide">{exam.label}</span>
        <span className={`block text-xs ${onDark ? "text-white/70 dark:text-foreground/70" : "text-muted"}`}>{exam.sub} · <strong className={onDark ? "text-white dark:text-foreground" : "text-foreground"}>GH₵ {price}</strong></span>
      </span>
    </div>
  );
}

/** How students buy a results checker through the CheckResultGH short code with this site's vendor code. */
export function BuyCheckerCard({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!hasCheckerSales) return null;

  const copy = async () => {
    track("checker_click", { channel: "copy" });
    await navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card space-y-4" id="buy-checker">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Smartphone size={22} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Need a results checker?</h2>
          <p className="text-sm text-muted">
            Buy a genuine WAEC checker on any network in seconds. Dial the code, enter our vendor code, pay with MoMo, and
            your serial number and PIN arrive by SMS.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2/70 p-4">
          <p className="text-xs text-muted">1. Dial</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{CHECKERS.ussd}</p>
        </div>
        <div className="rounded-xl bg-brand-soft p-4">
          <p className="text-xs text-muted">2. Enter vendor code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-brand">{CHECKERS.vendorCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {EXAMS.map((e) => <ExamBadge key={e.key} exam={e} />)}
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <a href={dialHref} onClick={() => track("checker_click", { channel: "dial" })} className="btn-primary">
          <Phone size={16} /> Dial {CHECKERS.ussd}
        </a>
        <button type="button" onClick={copy} className="btn-ghost">
          {copied ? <Check size={16} className="text-brand" /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("checker_click", { channel: "whatsapp" })}
          className="btn-ghost"
        >
          <Share2 size={16} /> WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(shareText)}`} onClick={() => track("checker_click", { channel: "sms" })} className="btn-ghost">
          <MessageSquare size={16} /> SMS
        </a>
      </div>

      {!compact && (
        <p className="text-xs text-muted">
          Checkers are supplied through CheckResultGH, a WAEC result checker reseller. Each checker works for a limited number
          of result checks, so keep your serial and PIN safe and never share them.
          {CHECKERS.examLogo && " WAEC and the WAEC logo are trademarks of the West African Examinations Council; this site is not affiliated with WAEC."}
        </p>
      )}
    </section>
  );
}

/** One-line "dial to buy" strip for the home page banner: the fastest path to a checker. */
export function DialCodeStrip() {
  const [copied, setCopied] = useState(false);
  if (!hasCheckerSales) return null;
  return (
    <div className="mt-6 flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur-sm">
      <Smartphone size={20} className="shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="block font-semibold">Buy a WASSCE / BECE checker</span>
        <span className="text-white/80 dark:text-foreground/80">
          Dial <strong className="font-mono text-white dark:text-foreground">{CHECKERS.ussd}</strong> · vendor code{" "}
          <strong className="font-mono tracking-widest text-white dark:text-foreground">{CHECKERS.vendorCode}</strong>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {EXAMS.map((e) => <ExamBadge key={e.key} exam={e} size="sm" onDark />)}
        </span>
      </p>
      <div className="flex shrink-0 gap-2">
        <a
          href={dialHref}
          onClick={() => track("checker_click", { channel: "dial-home" })}
          className="btn bg-accent !px-3 !py-2 text-[#1d1600] hover:brightness-95"
        >
          <Phone size={15} /> Dial
        </a>
        <button
          type="button"
          onClick={async () => {
            track("checker_click", { channel: "copy-home" });
            await navigator.clipboard.writeText(shareText).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn border border-white/30 !px-3 !py-2 text-white hover:bg-white/10 dark:text-foreground"
          aria-label="Copy how to buy"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}

/** Larger "dial to buy" panel for the right-hand side of the home page banner on desktop. */
export function DialCodePanel() {
  const [copied, setCopied] = useState(false);
  if (!hasCheckerSales) return null;
  return (
    <div className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone size={18} className="text-accent" aria-hidden /> Buy a results checker
      </p>
      <p className="mt-1 text-sm text-white/75 dark:text-foreground/75">Genuine WAEC checkers, paid with MoMo. Serial and PIN by SMS.</p>
      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-xs text-white/70 dark:text-foreground/70">1. Dial</p>
          <p className="font-mono text-3xl font-bold tracking-wide">{CHECKERS.ussd}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-brand dark:bg-surface">
          <p className="text-xs text-muted">2. Enter vendor code</p>
          <p className="font-mono text-3xl font-bold tracking-[0.35em]">{CHECKERS.vendorCode}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {EXAMS.map((e) => <ExamBadge key={e.key} exam={e} onDark />)}
      </div>
      {CHECKERS.examLogo && (
        <p className="mt-2 text-[10px] leading-snug text-white/60 dark:text-foreground/60">WAEC logo is a trademark of the West African Examinations Council. Not affiliated with WAEC.</p>
      )}
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <a
          href={dialHref}
          onClick={() => track("checker_click", { channel: "dial-home" })}
          className="btn bg-accent text-[#1d1600] hover:brightness-95"
        >
          <Phone size={16} /> Dial {CHECKERS.ussd}
        </a>
        <button
          type="button"
          onClick={async () => {
            track("checker_click", { channel: "copy-home" });
            await navigator.clipboard.writeText(shareText).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn border border-white/30 text-white hover:bg-white/10 dark:text-foreground"
          aria-label="Copy how to buy"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
