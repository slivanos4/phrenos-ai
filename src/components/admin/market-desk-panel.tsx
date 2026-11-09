"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Overview, HoldingView } from "@/lib/market-desk/overview";
import type { AlertRow, SearchHit } from "@/lib/market-desk/types";
import {
  Disclaimer,
  RiskBadge,
  RiskMeter,
  Sparkline,
  Stat,
  api,
  eur,
  eyebrowClass,
  fieldClass,
  ghostButtonClass,
  gbp,
  labelClass,
  microButtonClass,
  panelClass,
  pct,
  price,
  primaryButtonClass,
  tone,
  when,
} from "@/components/admin/market-desk-ui";
import { RankingsTab } from "@/components/admin/market-desk-rankings";
import { DashboardsTab } from "@/components/admin/market-desk-dashboards";
import { BriefTab, MarketsTab, SignalsTab } from "@/components/admin/market-desk-research";

type Tab = "overview" | "dashboards" | "rankings" | "holdings" | "brief" | "signals" | "markets" | "settings";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "dashboards", label: "Dashboards" },
  { key: "rankings", label: "Rankings" },
  { key: "holdings", label: "Holdings" },
  { key: "brief", label: "Weekly brief" },
  { key: "signals", label: "Signals and launches" },
  { key: "markets", label: "Markets and watchlist" },
  { key: "settings", label: "Alerts and settings" },
];

const SEVERITY: Record<string, string> = {
  critical: "border-[#e8b4a0]/70 bg-[#e8b4a0]/8",
  warning: "border-[#e0c078]/60 bg-[#e0c078]/8",
  info: "border-[#a9b0a3]/35 bg-[#0a100c]/50",
};

export function MarketDeskPanel() {
  const [state, setState] = useState<"loading" | "signed-out" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<{ signedOut: boolean; overview: Overview | null; error: string | null }> => {
    try {
      const auth = await api<{ authenticated: boolean }>("/api/phrenos-updates/auth");
      if (!auth.authenticated) return { signedOut: true, overview: null, error: null };
      return { signedOut: false, overview: await api<Overview>("/api/market-desk/overview"), error: null };
    } catch (cause) {
      return { signedOut: false, overview: null, error: cause instanceof Error ? cause.message : "Could not load Market Desk." };
    }
  }, []);

  const apply = useCallback((outcome: Awaited<ReturnType<typeof fetchAll>>) => {
    if (outcome.signedOut) return setState("signed-out");
    if (outcome.overview) setOverview(outcome.overview);
    setError(outcome.error);
    setState("ready");
  }, []);

  const load = useCallback(async () => apply(await fetchAll()), [apply, fetchAll]);

  useEffect(() => {
    void fetchAll().then(apply);
  }, [fetchAll, apply]);

  if (state === "loading") {
    return <div className={panelClass}><p className="text-sm text-[#a9b0a3]">Loading Market Desk...</p></div>;
  }

  if (state === "signed-out") {
    return (
      <div className={`${panelClass} max-w-md`}>
        <h2 className="font-serif text-2xl text-[#f1e8d6]">Sign in first</h2>
        <p className="mt-2 text-sm text-[#a9b0a3]">Market Desk uses the same sign in as the rest of the admin, with your authenticator code.</p>
        <Link href="/admin/ai-updates" className={`${primaryButtonClass} mt-4`}>Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Market Desk sections" className="sticky top-0 z-20 -mx-1 flex flex-wrap gap-2 bg-[#0a100c]/90 px-1 py-2 backdrop-blur">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${
              tab === item.key ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3] hover:border-[#d4af5a]/60"
            }`}
          >
            {item.label}
            {item.key === "overview" && overview && overview.alerts.length > 0 ? ` (${overview.alerts.length})` : ""}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-xl border border-[#e8b4a0]/40 bg-[#e8b4a0]/5 px-4 py-3 text-sm text-[#e8b4a0]" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-[#8fbf9f]/35 bg-[#8fbf9f]/5 px-4 py-3 text-sm text-[#cfe0d1]" role="status">{notice}</p> : null}

      {overview ? (
        <>
          {tab === "overview" ? <OverviewTab overview={overview} reload={load} setNotice={setNotice} setError={setError} onTab={setTab} /> : null}
          {tab === "dashboards" ? <DashboardsTab overview={overview} setError={setError} setNotice={setNotice} /> : null}
          {tab === "rankings" ? <RankingsTab setError={setError} setNotice={setNotice} /> : null}
          {tab === "holdings" ? <HoldingsTab overview={overview} reload={load} setNotice={setNotice} setError={setError} /> : null}
          {tab === "brief" ? <BriefTab setNotice={setNotice} setError={setError} reload={load} /> : null}
          {tab === "signals" ? <SignalsTab /> : null}
          {tab === "markets" ? <MarketsTab overview={overview} reload={load} setNotice={setNotice} setError={setError} /> : null}
          {tab === "settings" ? <SettingsTab overview={overview} reload={load} setNotice={setNotice} setError={setError} /> : null}
        </>
      ) : null}
      <Disclaimer />
    </div>
  );
}

type Shared = {
  reload: () => Promise<void>;
  setNotice: (value: string | null) => void;
  setError: (value: string | null) => void;
};

function OverviewTab({ overview, reload, setNotice, setError, onTab }: Shared & { overview: Overview; onTab: (tab: Tab) => void }) {
  const [checking, setChecking] = useState(false);
  const [brief, setBrief] = useState<{ title: string; week_start: string; sections: { summary?: string[] } } | null>(null);
  const [events, setEvents] = useState<{ title: string; event_date: string; impact: string; region: string; source_url: string }[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    void api<{ brief: typeof brief }>("/api/market-desk/brief").then((result) => setBrief(result.brief)).catch(() => undefined);
    void api<{ events: typeof events }>("/api/market-desk/events").then((result) => { setEvents(result.events); setLoadedAt(Date.now()); }).catch(() => undefined);
  }, []);

  const upcoming = events
    .filter((event) => event.event_date && new Date(event.event_date).getTime() >= loadedAt - 3600000 && (event.impact === "high" || event.impact === "medium"))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 6);

  async function checkNow() {
    setChecking(true);
    setError(null);
    try {
      const result = await api<{ refreshed: number; newAlerts: number; failed: string[] }>("/api/market-desk/check", { method: "POST" });
      setNotice(`Checked ${result.refreshed} holding${result.refreshed === 1 ? "" : "s"}. ${result.newAlerts} new warning${result.newAlerts === 1 ? "" : "s"}.${result.failed.length ? ` Could not refresh: ${result.failed.join("; ")}` : ""}`);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The check failed.");
    } finally {
      setChecking(false);
    }
  }

  async function dismiss(alert: AlertRow) {
    await api(`/api/market-desk/alerts/${alert.id}`, { method: "PATCH" }).catch(() => undefined);
    await reload();
  }

  const { totals } = overview;
  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={eyebrowClass}>Portfolio health</p>
            <p className="mt-1 text-sm text-[#a9b0a3]">{overview.holdings.length} open holding{overview.holdings.length === 1 ? "" : "s"}. Prices refresh every day, and when you press Check now.</p>
          </div>
          <button type="button" className={ghostButtonClass} onClick={() => void checkNow()} disabled={checking || overview.holdings.length === 0}>
            {checking ? "Checking..." : "Check now"}
          </button>
        </div>
        {overview.holdings.length === 0 ? (
          <p className="mt-5 text-sm text-[#a9b0a3]">
            Nothing here yet. Add what you hold in the <button type="button" className="text-[#e0c078] underline-offset-4 hover:underline" onClick={() => onTab("holdings")}>Holdings</button> tab and this fills in with value, profit or loss, risk and warnings.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Value" hint={eur(totals.value_eur)}>{gbp(totals.value_gbp)}</Stat>
              <Stat label="Profit or loss" hint={pct(totals.pl_pct)}><span className={tone(totals.pl_gbp)}>{gbp(totals.pl_gbp)}</span></Stat>
              <Stat label="Portfolio risk" hint={totals.risk_score !== null ? `${totals.risk_score} out of 100` : undefined}>{totals.risk_label ?? "n/a"}</Stat>
              <Stat label="Open warnings">{overview.alerts.length}</Stat>
            </div>
            <div className="mt-4"><RiskMeter score={totals.risk_score} /><div className="mt-1 flex justify-between text-[10px] text-[#a9b0a3]"><span>Safest</span><span>Most volatile</span></div></div>
            <div className="mt-5">
              <p className={eyebrowClass}>Where it is held</p>
              <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#0a100c]">
                {overview.allocation.map((slice, index) => (
                  <span key={slice.type} title={`${slice.type} ${(slice.share * 100).toFixed(0)}%`} style={{ width: `${slice.share * 100}%`, opacity: 1 - index * 0.14 }} className="bg-[#d4af5a]" />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#a9b0a3]">{overview.allocation.map((slice) => `${slice.type} ${(slice.share * 100).toFixed(0)}%`).join("  ·  ")}</p>
            </div>
          </>
        )}
      </section>

      <section className={panelClass}>
        <p className={eyebrowClass}>Warnings on your holdings</p>
        {overview.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-[#a9b0a3]">No open warnings. They appear here, by email and as a phone notification when a holding hits one of your alert rules.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {overview.alerts.map((alert) => (
              <li key={alert.id} className={`rounded-xl border px-4 py-3 ${SEVERITY[alert.severity] ?? SEVERITY.info}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f1e8d6]">{alert.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#c9c6ba]">{alert.message}</p>
                    <p className="mt-1 text-[10px] text-[#a9b0a3]">{alert.severity} · {when(alert.created_at)}</p>
                    {alert.asset_key ? (
                      <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(alert.asset_key)}&alert=${alert.id}`} className="mt-2 inline-block text-xs font-semibold text-[#e0c078] underline-offset-4 hover:underline">See why, with the chart and sources →</Link>
                    ) : typeof alert.data?.source_url === "string" ? (
                      <a href={alert.data.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#e0c078] underline-offset-4 hover:underline">Open the announcement ↗</a>
                    ) : null}
                  </div>
                  <button type="button" className={microButtonClass} onClick={() => void dismiss(alert)}>Dismiss</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className={panelClass}>
          <p className={eyebrowClass}>Coming up</p>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-[#a9b0a3]">No major announcements loaded yet. They load each morning.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((event) => (
                <li key={`${event.title}${event.event_date}`} className="text-sm text-[#f1e8d6]">
                  <span className="text-[11px] text-[#a9b0a3]">{when(event.event_date)} · {event.impact}</span>
                  <br /><a href={event.source_url.split("#")[0]} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-[#e0c078] hover:underline">{event.title}</a>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`${microButtonClass} mt-3`} onClick={() => onTab("signals")}>All announcements</button>
        </div>
        <div className={panelClass}>
          <p className={eyebrowClass}>This week&apos;s brief</p>
          {brief ? (
            <>
              <p className="mt-2 font-serif text-lg text-[#f1e8d6]">{brief.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">
                {(brief.sections.summary ?? []).slice(0, 4).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#a9b0a3]">No brief yet. One is written every Monday, or you can write it now.</p>
          )}
          <button type="button" className={`${microButtonClass} mt-3`} onClick={() => onTab("brief")}>{brief ? "Read the brief" : "Write it now"}</button>
        </div>
      </section>
    </div>
  );
}

function HoldingRowView({ holding, onDone, setNotice, setError }: { holding: HoldingView; onDone: () => Promise<void> } & Pick<Shared, "setNotice" | "setError">) {
  const [open, setOpen] = useState(false);
  const asset = holding.asset;

  async function close() {
    const input = window.prompt(`Sold ${holding.symbol}? Enter the sell price per unit (or leave blank to just close it).`);
    if (input === null) return;
    const sell = input.trim() === "" ? null : Number(input);
    if (sell !== null && !(sell > 0)) return setError("Enter a sell price above zero.");
    try {
      await api(`/api/market-desk/holdings/${holding.id}`, { method: "PATCH", json: { action: "close", sell_price: sell } });
      setNotice(`${holding.symbol} closed.`);
      await onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close it.");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${holding.symbol} from your holdings? This cannot be undone.`)) return;
    try {
      await api(`/api/market-desk/holdings/${holding.id}`, { method: "DELETE" });
      await onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete it.");
    }
  }

  return (
    <li className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#f1e8d6]"><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(holding.asset_key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{holding.name || holding.symbol}</Link> <span className="font-normal text-[#a9b0a3]">{holding.symbol} · {holding.asset_type}</span></p>
          <p className="text-[11px] text-[#a9b0a3]">
            {holding.quantity} bought at {price(holding.buy_price, holding.buy_currency)}{holding.buy_date ? ` on ${when(holding.buy_date)}` : ""}
          </p>
        </div>
        <Sparkline values={asset?.history ?? []} />
        <div className="text-right">
          <p className="text-sm text-[#f1e8d6]">{gbp(holding.value_gbp)} <span className="text-[11px] text-[#a9b0a3]">{eur(holding.value_eur)}</span></p>
          <p className={`text-xs ${tone(holding.pl_pct)}`}>{pct(holding.pl_pct)} {holding.pl_gbp !== null ? `(${gbp(holding.pl_gbp)})` : ""}</p>
        </div>
        <RiskBadge label={asset?.risk_label} score={asset?.risk_score} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className={microButtonClass} onClick={() => setOpen((current) => !current)}>{open ? "Hide why" : "Why this risk?"}</button>
        <button type="button" className={microButtonClass} onClick={() => void close()}>Mark as sold</button>
        <button type="button" className={microButtonClass} onClick={() => void remove()}>Delete</button>
        {holding.from_high_pct !== null ? <span className={`text-[11px] ${tone(holding.from_high_pct)}`}>{pct(holding.from_high_pct)} from its high since you bought</span> : null}
      </div>
      {open && asset ? (
        <div className="mt-3 border-t border-[#d4af5a]/15 pt-3">
          <RiskMeter score={asset.risk_score} />
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">
            {asset.risk_reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          <p className="mt-2 text-[11px] text-[#a9b0a3]">30 days {pct(asset.change_30d)} · 90 days {pct(asset.change_90d)} · prices updated {when(asset.updated_at)}</p>
        </div>
      ) : null}
    </li>
  );
}

type CsvRow = { symbol: string; quantity: number; buy_price: number; buy_date?: string; currency?: string; type?: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const column = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const iSymbol = column("symbol", "ticker", "asset");
  const iQty = column("quantity", "qty", "amount", "units");
  const iPrice = column("buy_price", "price", "buy price", "cost");
  const iDate = column("buy_date", "date");
  const iCur = column("currency", "buy_currency");
  const iType = column("type", "asset_type");
  if (iSymbol < 0 || iQty < 0 || iPrice < 0) return [];
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return {
      symbol: cells[iSymbol],
      quantity: Number(cells[iQty]),
      buy_price: Number(cells[iPrice]),
      buy_date: iDate >= 0 ? cells[iDate] || undefined : undefined,
      currency: iCur >= 0 ? cells[iCur] || undefined : undefined,
      type: iType >= 0 ? cells[iType] || undefined : undefined,
    };
  }).filter((row) => row.symbol && row.quantity > 0 && row.buy_price > 0);
}

function HoldingsTab({ overview, reload, setNotice, setError }: Shared & { overview: Overview }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SearchHit | null>(null);
  const [form, setForm] = useState({ quantity: "", buy_price: "", buy_currency: "GBP", buy_date: "" });
  const [saving, setSaving] = useState(false);
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  async function search() {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      setHits((await api<{ hits: SearchHit[] }>(`/api/market-desk/search?q=${encodeURIComponent(query.trim())}`)).hits);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/market-desk/holdings", { method: "POST", json: { asset_key: picked.key, quantity: Number(form.quantity), buy_price: Number(form.buy_price), buy_currency: form.buy_currency, buy_date: form.buy_date || undefined } });
      setNotice(`${picked.name} added.`);
      setPicked(null);
      setHits([]);
      setQuery("");
      setForm({ quantity: "", buy_price: "", buy_currency: "GBP", buy_date: "" });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add it.");
    } finally {
      setSaving(false);
    }
  }

  async function runImport() {
    const rows = parseCsv(csv);
    if (rows.length === 0) return setError("No usable rows. The first line needs the headings symbol, quantity and buy_price.");
    setImporting(true);
    setError(null);
    try {
      const result = await api<{ added: string[]; failed: { symbol: string; reason: string }[] }>("/api/market-desk/holdings/import", { method: "POST", json: { rows } });
      setNotice(`Imported ${result.added.length}.${result.failed.length ? ` Could not match: ${result.failed.map((item) => `${item.symbol} (${item.reason})`).join(", ")}.` : ""}`);
      setCsv("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const sorted = [...overview.holdings].sort((a, b) => (a.asset?.risk_score ?? 0) - (b.asset?.risk_score ?? 0));

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <p className={eyebrowClass}>Add a holding</p>
        {picked ? (
          <form onSubmit={add} className="mt-3 space-y-3">
            <p className="text-sm text-[#f1e8d6]">{picked.name} <span className="text-[#a9b0a3]">{picked.symbol} · {picked.type}</span> <button type="button" className="ml-2 text-xs text-[#e0c078] underline-offset-4 hover:underline" onClick={() => setPicked(null)}>change</button></p>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="space-y-1.5"><span className={labelClass}>Quantity</span><input className={fieldClass} inputMode="decimal" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelClass}>Buy price (each)</span><input className={fieldClass} inputMode="decimal" required value={form.buy_price} onChange={(event) => setForm({ ...form, buy_price: event.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelClass}>Currency you paid in</span><select className={fieldClass} value={form.buy_currency} onChange={(event) => setForm({ ...form, buy_currency: event.target.value })}>{["GBP", "EUR", "USD"].map((code) => <option key={code}>{code}</option>)}</select></label>
              <label className="space-y-1.5"><span className={labelClass}>Date bought</span><input type="date" className={fieldClass} value={form.buy_date} onChange={(event) => setForm({ ...form, buy_date: event.target.value })} /></label>
            </div>
            <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? "Adding..." : "Add holding"}</button>
          </form>
        ) : (
          <>
            <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="mt-3 flex flex-wrap gap-2">
              <input className={`${fieldClass} max-w-sm`} placeholder="Search a stock, ETF, coin, currency or metal" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit" className={ghostButtonClass} disabled={searching}>{searching ? "Searching..." : "Search"}</button>
            </form>
            {hits.length > 0 ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {hits.map((hit) => (
                  <li key={hit.key}><button type="button" onClick={() => setPicked(hit)} className="w-full rounded-xl border border-[#d4af5a]/25 px-3 py-2 text-left text-sm text-[#f1e8d6] hover:border-[#d4af5a]/60">{hit.name}<span className="block text-[11px] text-[#a9b0a3]">{hit.symbol} · {hit.type}{hit.exchange ? ` · ${hit.exchange}` : ""}</span></button></li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold tracking-[0.14em] text-[#e0c078] uppercase">Import from a CSV</summary>
          <p className="mt-2 text-xs text-[#a9b0a3]">Paste rows with the headings <code className="text-[#e0c078]">symbol,quantity,buy_price</code>. Optional: <code className="text-[#e0c078]">buy_date,currency,type</code> (use type crypto for coins). Up to 100 rows.</p>
          <textarea className={`${fieldClass} mt-2 min-h-[8rem] font-mono text-xs`} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={"symbol,quantity,buy_price,buy_date,currency,type\nAAPL,10,150,2025-03-01,USD\nBTC,0.05,30000,2025-06-10,GBP,crypto"} />
          <button type="button" className={`${ghostButtonClass} mt-2`} disabled={importing || csv.trim() === ""} onClick={() => void runImport()}>{importing ? "Importing..." : "Import"}</button>
        </details>
      </section>

      <section className={panelClass}>
        <div className="flex items-baseline justify-between gap-3">
          <p className={eyebrowClass}>Open holdings, safest to riskiest</p>
          <p className="text-[11px] text-[#a9b0a3]">{sorted.length} open</p>
        </div>
        {sorted.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">No holdings yet.</p> : (
          <ul className="mt-3 space-y-2.5">
            {sorted.map((holding) => <HoldingRowView key={holding.id} holding={holding} onDone={reload} setNotice={setNotice} setError={setError} />)}
          </ul>
        )}
      </section>

      {overview.closed.length > 0 ? (
        <section className={panelClass}>
          <p className={eyebrowClass}>Closed</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#c9c6ba]">
            {overview.closed.map((holding) => (
              <li key={holding.id}>{holding.name || holding.symbol}: bought at {price(holding.buy_price, holding.buy_currency)}{holding.sell_price ? `, sold at ${price(holding.sell_price)}` : ""} ({when(holding.sold_at)})</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = { fx: "Currency", bond: "Bond", etf: "ETF", commodity: "Commodity", stock: "Stock", crypto: "Crypto" };

function SettingsTab({ overview, reload, setNotice, setError }: Shared & { overview: Overview }) {
  const [email, setEmail] = useState(overview.settings.alert_email ?? "");
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries({ ...overview.defaults, ...overview.settings.thresholds }).map(([key, value]) => [key, String(value)])),
  );
  const [saving, setSaving] = useState(false);
  const [pushState, setPushState] = useState<"unknown" | "on" | "off" | "unsupported">("unknown");
  const [health, setHealth] = useState<{ name: string; used_for: string; ok: boolean; detail: string; ms: number }[] | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/market-desk-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      setPushState(subscription ? "on" : "off");
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const thresholds: Record<string, number> = {};
      for (const [key, value] of Object.entries(limits)) if (Number(value) !== overview.defaults[key]) thresholds[key] = Number(value);
      await api("/api/market-desk/settings", { method: "PUT", json: { alert_email: email, thresholds } });
      setNotice("Saved.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    setError(null);
    try {
      const { publicKey } = await api<{ publicKey: string | null }>("/api/market-desk/push");
      if (!publicKey) throw new Error("Push notifications are not set up on the server yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were blocked in this browser. Allow them for this site and try again.");
      const registration = await navigator.serviceWorker.register("/market-desk-sw.js");
      await navigator.serviceWorker.ready;
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const raw = atob((publicKey + padding).replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from(raw, (char) => char.charCodeAt(0));
      const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      await api("/api/market-desk/push", { method: "POST", json: { subscription: subscription.toJSON() } });
      setPushState("on");
      setNotice("Notifications are on for this device. Press Send a test to check.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not turn notifications on.");
    }
  }

  async function testPush() {
    try {
      const result = await api<{ sent: number }>("/api/market-desk/push", { method: "POST", json: { test: true } });
      setNotice(result.sent > 0 ? "Test sent." : "No device is subscribed yet.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Test failed.");
    }
  }

  async function testSources() {
    setTesting(true);
    try {
      setHealth((await api<{ results: NonNullable<typeof health> }>("/api/market-desk/health")).results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not test the data sources.");
    } finally {
      setTesting(false);
    }
  }

  const types = ["fx", "bond", "etf", "commodity", "stock", "crypto"];
  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <p className={eyebrowClass}>Where warnings go</p>
        <label className="mt-3 block max-w-md space-y-1.5"><span className={labelClass}>Email for warnings and the weekly brief</span><input type="email" className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-sm text-[#c9c6ba]">Phone or browser notifications: <strong className="text-[#f1e8d6]">{pushState === "on" ? "on" : pushState === "unsupported" ? "not supported here" : "off"}</strong></p>
          {pushState !== "unsupported" ? <button type="button" className={microButtonClass} onClick={() => void enablePush()}>{pushState === "on" ? "Re-register this device" : "Turn on for this device"}</button> : null}
          {pushState === "on" ? <button type="button" className={microButtonClass} onClick={() => void testPush()}>Send a test</button> : null}
        </div>
        <p className="mt-2 text-[11px] text-[#a9b0a3]">On your phone, open this page in Chrome, choose Install app or Add to Home screen, then turn notifications on from the installed app.</p>
      </section>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrowClass}>Data sources</p>
          <button type="button" className={microButtonClass} onClick={() => void testSources()} disabled={testing}>{testing ? "Testing..." : "Test them now"}</button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#a9b0a3]">Everything here comes from free public sources. If one stops answering, holdings that depend on it show a &quot;prices could not be refreshed&quot; warning instead of going quiet.</p>
        {health ? (
          <ul className="mt-3 space-y-1.5">
            {health.map((item) => (
              <li key={item.name} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-[#f1e8d6]"><span className={item.ok ? "text-[#8fbf9f]" : "text-[#e8b4a0]"}>{item.ok ? "●" : "●"}</span> {item.name} <span className="text-[11px] text-[#a9b0a3]">{item.used_for}</span></span>
                <span className={`text-[11px] ${item.ok ? "text-[#a9b0a3]" : "text-[#e8b4a0]"}`}>{item.detail}{item.ok ? ` · ${item.ms}ms` : ""}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={panelClass}>
        <p className={eyebrowClass}>When to warn me</p>
        <p className="mt-2 text-xs leading-relaxed text-[#a9b0a3]">Riskier assets swing more, so their warning points are wider. &quot;From the high&quot; is the fall since the highest price after you bought. &quot;In a day&quot; is a single-day drop. The values below are the defaults. Change any you like.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead><tr className="text-[10px] tracking-[0.16em] text-[#a9b0a3] uppercase"><th className="py-1 pr-3">Asset</th><th className="py-1 pr-3">Fall from the high (%)</th><th className="py-1">Fall in a day (%)</th></tr></thead>
            <tbody>
              {types.map((type) => (
                <tr key={type} className="border-t border-[#d4af5a]/10">
                  <td className="py-2 pr-3 text-[#f1e8d6]">{TYPE_LABELS[type]}</td>
                  {(["drop", "day"] as const).map((kind) => (
                    <td key={kind} className="py-2 pr-3"><input className={`${fieldClass} w-24 py-1.5`} inputMode="decimal" value={limits[`${kind}_${type}`] ?? ""} onChange={(event) => setLimits({ ...limits, [`${kind}_${type}`]: event.target.value })} /></td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-[#d4af5a]/10"><td className="py-2 pr-3 text-[#f1e8d6]">One holding above (% of portfolio)</td><td className="py-2 pr-3"><input className={`${fieldClass} w-24 py-1.5`} inputMode="decimal" value={limits.concentration ?? ""} onChange={(event) => setLimits({ ...limits, concentration: event.target.value })} /></td><td /></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[#a9b0a3]">Also checked automatically: dropping below the 200-day or 50-day average, much bigger price swings than usual, a jump in the risk score, and big central bank or economic announcements due in the next day.</p>
        <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </section>
    </div>
  );
}
