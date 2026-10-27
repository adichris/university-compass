"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Search, ShoppingCart } from "lucide-react";

interface Item {
  serial: string;
  pin: string;
}
interface Order {
  reference: string;
  type: "WAEC" | "BECE";
  quantity: number;
  unit_price: number;
  total: number;
  balance?: number;
  mode: "live" | "test";
  replay?: boolean;
  created_at: string;
  items: Item[];
}
interface Status {
  configured: boolean;
  mode: "live" | "test" | null;
  shortCode: { ussd: string; vendorCode: string; prices: Record<string, number> };
  recent: { reference: string; type: string; quantity: number; total: number; mode: string; note: string | null; createdAt: number }[];
}

const money = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? "-" : `GH₵ ${v.toFixed(2)}`);

async function post(body: unknown): Promise<{ order?: Order; error?: string }> {
  const res = await fetch("/api/admin/checkers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ error: "Unexpected response" }));
}

export function CheckersPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [type, setType] = useState<"WAEC" | "BECE">("WAEC");
  const [quantity, setQuantity] = useState(1);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmLive, setConfirmLive] = useState(false);
  const [lookupRef, setLookupRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/checkers", { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/checkers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => !cancelled && s && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (body: unknown) => {
    setBusy(true);
    setError(null);
    setOrder(null);
    const result = await post(body);
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.order) {
      setOrder(result.order);
      setReference("");
      setConfirmLive(false);
      refresh();
    }
  };

  if (!status) return <div className="card h-40 animate-pulse" />;
  const live = status.mode === "live";
  const price = status.shortCode.prices[type === "WAEC" ? "WASSCE" : "BECE"];

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Partner API</p>
          <p className="mt-1 font-semibold">
            {!status.configured ? (
              <span className="text-danger">Not connected</span>
            ) : live ? (
              <span className="text-[var(--safe)]">Live key</span>
            ) : (
              <span className="text-[var(--reach)]">Test key (no real charges)</span>
            )}
          </p>
          {!status.configured && <p className="mt-1 text-xs text-muted">Add CRG_KEY and CRG_SECRET to the site&apos;s environment, then restart.</p>}
        </div>
        <div>
          <p className="text-xs text-muted">Customer short code</p>
          <p className="mt-1 font-mono font-semibold">{status.shortCode.ussd} · vendor {status.shortCode.vendorCode}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Selling prices</p>
          <p className="mt-1 font-semibold">WASSCE {money(status.shortCode.prices.WASSCE)} · BECE {money(status.shortCode.prices.BECE)}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run({ action: "buy", type, quantity, reference: reference.trim() || undefined, note: note.trim() || undefined, confirmLive });
          }}
        >
          <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart size={18} /> Sell checkers</h2>
          <p className="text-sm text-muted">
            Buys from your CheckResultGH wallet and shows the serials and PINs here to send to the customer - for example after
            they pay you by MoMo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ck-type">Checker</label>
              <select id="ck-type" className="input" value={type} onChange={(e) => setType(e.target.value as "WAEC" | "BECE")}>
                <option value="WAEC">WASSCE (WAEC)</option>
                <option value="BECE">BECE</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ck-qty">Quantity</label>
              <input id="ck-qty" type="number" min={1} max={100} className="input" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ck-ref">Your reference (optional)</label>
            <input id="ck-ref" className="input font-mono" placeholder="Generated automatically" value={reference} onChange={(e) => setReference(e.target.value)} />
            <p className="mt-1 text-xs text-muted">Re-using a reference returns the same order instead of buying again.</p>
          </div>
          <div>
            <label className="label" htmlFor="ck-note">Note (optional)</label>
            <input id="ck-note" className="input" placeholder="e.g. customer name or MoMo transaction ID" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="text-sm text-muted">Customer price: {money(price * quantity)} ({quantity} × {money(price)})</p>
          {live && (
            <label className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={confirmLive} onChange={(e) => setConfirmLive(e.target.checked)} />
              This is a live order and will be charged to my CheckResultGH wallet.
            </label>
          )}
          <button className="btn-primary w-full" disabled={busy || !status.configured || (live && !confirmLive)}>
            {busy ? "Working…" : live ? "Buy and show PINs" : "Run a test purchase"}
          </button>
        </form>

        <div className="space-y-6">
          <form
            className="card space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run({ action: "lookup", reference: lookupRef.trim() });
            }}
          >
            <h2 className="flex items-center gap-2 font-semibold"><Search size={18} /> Look up an order</h2>
            <p className="text-sm text-muted">Shows a past order and its PINs again, e.g. if a customer lost theirs.</p>
            <div className="flex gap-2">
              <input className="input font-mono" placeholder="Reference" value={lookupRef} onChange={(e) => setLookupRef(e.target.value)} aria-label="Order reference" />
              <button className="btn-ghost shrink-0" disabled={busy || !status.configured || lookupRef.trim().length < 4}>Look up</button>
            </div>
          </form>

          {error && <p className="card text-sm text-danger">{error}</p>}
          {order && <OrderResult order={order} />}
        </div>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Recent dashboard sales</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr><th className="py-2">Date</th><th>Reference</th><th>Checker</th><th className="text-right">Qty</th><th className="text-right">Cost</th><th>Mode</th><th>Note</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {status.recent.map((r) => (
              <tr key={r.reference}>
                <td className="py-2 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button className="font-mono text-xs text-brand hover:underline" onClick={() => setLookupRef(r.reference)} title="Look up">{r.reference}</button>
                </td>
                <td>{r.type === "WAEC" ? "WASSCE" : r.type}</td>
                <td className="text-right">{r.quantity}</td>
                <td className="text-right">{money(r.total)}</td>
                <td><span className={`chip !py-0 ${r.mode === "live" ? "chip-active" : ""}`}>{r.mode}</span></td>
                <td className="max-w-40 truncate text-xs text-muted">{r.note}</td>
              </tr>
            ))}
            {status.recent.length === 0 && <tr><td className="py-2 text-muted" colSpan={7}>No sales from the dashboard yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function OrderResult({ order }: { order: Order }) {
  const [copied, setCopied] = useState<string | null>(null);
  const label = order.type === "WAEC" ? "WASSCE" : "BECE";
  const message = [
    `Your ${label} results checker${order.items.length > 1 ? "s" : ""}:`,
    ...order.items.map((it, i) => `${order.items.length > 1 ? `${i + 1}. ` : ""}Serial: ${it.serial}  PIN: ${it.pin}`),
    `Check your results at ${order.type === "WAEC" ? "https://ghana.waecdirect.org" : "the WAEC BECE results portal"}. Keep your PIN private.`,
  ].join("\n");

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{order.quantity} × {label} · <span className="font-mono text-sm">{order.reference}</span></h2>
        <span className={`chip ${order.mode === "live" ? "chip-active" : ""}`}>{order.mode}</span>
      </div>
      <p className="text-sm text-muted">
        Cost {money(order.total)} ({money(order.unit_price)} each)
        {order.balance !== undefined && ` · wallet balance ${money(order.balance)}`}
        {order.replay && " · this reference was already used, so this is the original order (no new charge)"}
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {order.items.map((it, i) => (
          <li key={`${it.serial}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 font-mono text-sm">
            <span>Serial <strong>{it.serial}</strong> · PIN <strong>{it.pin}</strong></span>
            <button className="text-muted hover:text-foreground" onClick={() => copy(`Serial: ${it.serial} PIN: ${it.pin}`, `i${i}`)} aria-label="Copy serial and PIN">
              {copied === `i${i}` ? <Check size={15} className="text-brand" /> : <Copy size={15} />}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => copy(message, "all")}>
          {copied === "all" ? <Check size={16} /> : <Copy size={16} />} Copy message for customer
        </button>
        <a className="btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
      </div>
      <p className="text-xs text-muted">PINs are not stored on this site. Use the reference to look them up again.</p>
    </section>
  );
}
