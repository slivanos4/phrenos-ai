"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RankingRow } from "@/lib/market-desk/rankings";
import {
  RiskBadge,
  Sparkline,
  api,
  eyebrowClass,
  fieldClass,
  ghostButtonClass,
  panelClass,
  pct,
  tone,
  when,
} from "@/components/admin/market-desk-ui";
import { MarketStrip, makeMoney, useMarketStats, type Currency } from "@/components/admin/market-desk-stats";

export const gbpCompact = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  if (value >= 1e12) return `£${(value / 1e12).toFixed(2)}tn`;
  if (value >= 1e9) return `£${(value / 1e9).toFixed(1)}bn`;
  if (value >= 1e6) return `£${(value / 1e6).toFixed(0)}m`;
  return `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
};

export const gbpPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "n/a";
  const digits = value >= 100 ? 0 : value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: digits === 0 ? 0 : 2, maximumFractionDigits: digits })}`;
};

export function Avatar({ row, size = 28 }: { row: Pick<RankingRow, "image" | "symbol" | "name">; size?: number }) {
  if (row.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.image} alt="" width={size} height={size} className="shrink-0 rounded-full" loading="lazy" />;
  }
  return (
    <span aria-hidden style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#d4af5a]/40 bg-[#d4af5a]/10 text-[10px] font-semibold text-[#e0c078]">
      {row.symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}
    </span>
  );
}

const VIEW_STYLE: Record<string, string> = {
  "Strongest evidence": "text-[#8fbf9f]",
  Positive: "text-[#a9d1b4]",
  Mixed: "text-[#e0c078]",
  "Weak evidence": "text-[#e8b4a0]",
};

export function ScoreBar({ score, view }: { score: number; view: string }) {
  return (
    <div className="min-w-[110px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif text-base text-[#f1e8d6]">{score}</span>
        <span className={`text-[10px] font-semibold tracking-wide ${VIEW_STYLE[view] ?? "text-[#a9b0a3]"}`}>{view}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0a100c]"><span className="block h-full rounded-full bg-[#d4af5a]" style={{ width: `${score}%` }} /></div>
    </div>
  );
}

const TYPES: [string, string][] = [["all", "All"], ["stock", "Stocks"], ["crypto", "Crypto"], ["etf", "ETFs"], ["bond", "Bonds"], ["commodity", "Commodities"]];
const RISKS: [string, string][] = [["all", "Any risk"], ["lower", "Lower risk"], ["moderate", "Moderate"], ["higher", "Higher risk"]];

type TabKey = "ranked" | "gainers" | "losers" | "traded" | "largest" | "strong" | "watch";
const LISTS: [TabKey, string][] = [["ranked", "Top ranked"], ["gainers", "Gainers"], ["losers", "Losers"], ["traded", "Most traded"], ["largest", "Largest"], ["strong", "Strongest evidence"], ["watch", "Watchlist"]];

type Timeframe = "change_1d" | "change_7d" | "change_30d" | "change_90d";
const FRAMES: [Timeframe, string][] = [["change_1d", "24h"], ["change_7d", "7d"], ["change_30d", "30d"], ["change_90d", "90d"]];

function riskBand(label: string | null): string {
  return label === "Very low" || label === "Low" ? "lower" : label === "Moderate" ? "moderate" : "higher";
}

type SortKey = "rank" | Timeframe | "market_cap_gbp" | "risk_score";

function Highlight({ title, row, note }: { title: string; row: RankingRow | undefined; note: string }) {
  if (!row) return null;
  return (
    <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(row.key)}`} className="block rounded-2xl border border-[#d4af5a]/25 bg-[#101c14]/88 p-4 transition-colors hover:border-[#d4af5a]/60">
      <p className={eyebrowClass}>{title}</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar row={row} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#f1e8d6]">{row.name} <span className="font-normal text-[#a9b0a3]">{row.symbol}</span></p>
          <p className="text-[11px] text-[#a9b0a3]">{note}</p>
        </div>
        <span className="ml-auto font-serif text-2xl text-[#e0c078]">{row.score}</span>
      </div>
    </Link>
  );
}

const chip = (active: boolean) => `rounded-full border px-3 py-1 text-[11px] font-semibold ${active ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3] hover:border-[#d4af5a]/60"}`;

export function RankingsTab({ setError, setNotice }: { setError: (value: string | null) => void; setNotice: (value: string | null) => void }) {
  const router = useRouter();
  const stats = useMarketStats();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [list, setList] = useState<TabKey>("ranked");
  const [type, setType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [query, setQuery] = useState("");
  const [frame, setFrame] = useState<Timeframe>("change_1d");
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [watch, setWatch] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    void api<{ rows: RankingRow[] }>("/api/market-desk/rankings")
      .then((result) => setRows(result.rows))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
    void api<{ keys: string[] }>("/api/market-desk/watchlist").then((result) => setWatch(new Set(result.keys))).catch(() => undefined);
  }, [setError]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const result = await api<{ ranked: number; noted: number; repaired: number; left_out: number }>("/api/market-desk/rankings", { method: "POST" });
      setRows((await api<{ rows: RankingRow[] }>("/api/market-desk/rankings")).rows);
      setNotice(`Rescanned ${result.ranked} assets and rewrote ${result.noted} research notes.${result.repaired + result.left_out > 0 ? ` The data check blanked impossible numbers on ${result.repaired} assets and left out ${result.left_out}.` : ""}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The rescan failed. Try again in a minute.");
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleWatch(key: string) {
    const on = watch.has(key);
    setWatch((current) => { const next = new Set(current); if (on) next.delete(key); else next.add(key); return next; });
    try {
      await api("/api/market-desk/watchlist", { method: on ? "DELETE" : "POST", json: { key } });
    } catch (cause) {
      setWatch((current) => { const next = new Set(current); if (on) next.add(key); else next.delete(key); return next; });
      setError(cause instanceof Error ? cause.message : "Could not update the watchlist.");
    }
  }

  const money = makeMoney(currency, stats?.rates ?? null);
  const frameLabel = FRAMES.find(([key]) => key === frame)?.[1] ?? "24h";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let filtered = rows.filter((row) =>
      (type === "all" || row.asset_type === type) &&
      (risk === "all" || riskBand(row.risk_label) === risk) &&
      (!needle || row.name.toLowerCase().includes(needle) || row.symbol.toLowerCase().includes(needle)),
    );
    if (list === "watch") filtered = filtered.filter((row) => watch.has(row.key));
    if (list === "strong") filtered = filtered.filter((row) => row.view === "Strongest evidence");
    if (list === "gainers") filtered = filtered.filter((row) => (row[frame] ?? 0) > 0);
    if (list === "losers") filtered = filtered.filter((row) => (row[frame] ?? 0) < 0);

    const listOrder: Record<TabKey, (a: RankingRow, b: RankingRow) => number> = {
      ranked: (a, b) => a.rank - b.rank,
      strong: (a, b) => a.rank - b.rank,
      watch: (a, b) => a.rank - b.rank,
      gainers: (a, b) => (b[frame] ?? -Infinity) - (a[frame] ?? -Infinity),
      losers: (a, b) => (a[frame] ?? Infinity) - (b[frame] ?? Infinity),
      traded: (a, b) => (b.volume_gbp ?? -1) - (a.volume_gbp ?? -1),
      largest: (a, b) => (b.market_cap_gbp ?? -1) - (a.market_cap_gbp ?? -1),
    };
    if (!sort) return [...filtered].sort(listOrder[list]);
    return [...filtered].sort((a, b) => {
      const x = a[sort.key] ?? (sort.dir === 1 ? Infinity : -Infinity);
      const y = b[sort.key] ?? (sort.dir === 1 ? Infinity : -Infinity);
      return (Number(x) - Number(y)) * sort.dir;
    });
  }, [rows, type, risk, query, sort, list, frame, watch]);

  const breadth = useMemo(() => {
    const known = rows.filter((row) => row[frame] !== null);
    return known.length ? { up: known.filter((row) => (row[frame] ?? 0) > 0).length, down: known.filter((row) => (row[frame] ?? 0) < 0).length, total: known.length } : null;
  }, [rows, frame]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * pageSize, current * pageSize + pageSize);

  const top = rows[0];
  const bestLower = rows.find((row) => riskBand(row.risk_label) === "lower");
  const bestHigher = rows.find((row) => riskBand(row.risk_label) === "higher");

  const reset = () => setPage(0);

  function header(label: string, key: SortKey, className = "") {
    const active = sort?.key === key;
    const marked = key === frame;
    return (
      <th className={`px-3 py-2.5 font-semibold ${className}`}>
        <button type="button" onClick={() => { setSort({ key, dir: active ? (sort!.dir === 1 ? -1 : 1) : key === "rank" || key === "risk_score" ? 1 : -1 }); reset(); }} className={`uppercase tracking-[0.12em] hover:text-[#e0c078] ${active || marked ? "text-[#e0c078]" : ""}`}>
          {label}{active ? (sort!.dir === 1 ? " ↑" : " ↓") : ""}
        </button>
      </th>
    );
  }

  const changeCell = (row: RankingRow, key: Timeframe) => <td className={`px-3 py-3 text-right ${tone(row[key])} ${key === frame ? "font-semibold" : ""}`}>{pct(row[key])}</td>;

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-serif text-2xl text-[#f1e8d6]">Research rankings</p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#a9b0a3]">Everything we scan, ordered by an evidence score from 0 to 100. The score rewards steady gains for the risk taken, an established uptrend, trends that agree, and bullish smart-money signals. It describes what the data shows. It is research, not a buy recommendation, and it cannot predict what happens next.</p>
          </div>
          <button type="button" className={ghostButtonClass} onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Rescanning, about 1 to 2 minutes..." : "Rescan now"}</button>
        </div>
        {rows[0] ? <p className="mt-2 text-[11px] text-[#a9b0a3]">{rows.length} assets · scan updated {when(rows[0].updated_at)} · refreshed every morning, notes rewritten on Mondays</p> : null}
      </section>

      <MarketStrip stats={stats} currency={currency} breadth={breadth} timeframe={frameLabel} />

      {loading ? <p className="text-sm text-[#a9b0a3]">Loading the rankings...</p> : null}
      {!loading && rows.length === 0 ? <div className={panelClass}><p className="text-sm text-[#a9b0a3]">No rankings yet. Press Rescan now to build the first list.</p></div> : null}

      {rows.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Highlight title="Top ranked overall" row={top} note={`${top?.view}, ${top?.risk_label} risk`} />
            <Highlight title="Best of the lower-risk" row={bestLower} note={`Rank #${bestLower?.rank}, ${bestLower?.risk_label} risk`} />
            <Highlight title="Best of the higher-risk" row={bestHigher} note={`Rank #${bestHigher?.rank}, ${bestHigher?.risk_label} risk`} />
          </div>

          <section className={panelClass}>
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Lists">
              {LISTS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={list === key} onClick={() => { setList(key); setSort(null); reset(); }} className={chip(list === key)}>{label}{key === "watch" && watch.size > 0 ? ` (${watch.size})` : ""}</button>)}
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1" aria-label="Timeframe">{FRAMES.map(([key, label]) => <button key={key} type="button" onClick={() => { setFrame(key); reset(); }} className={chip(frame === key)}>{label}</button>)}</span>
                <span className="flex items-center gap-1" aria-label="Currency">{(["GBP", "USD", "EUR"] as Currency[]).map((code) => <button key={code} type="button" disabled={code !== "GBP" && !stats?.rates[code]} onClick={() => setCurrency(code)} className={`${chip(currency === code)} disabled:opacity-40`}>{code}</button>)}</span>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {TYPES.map(([key, label]) => <button key={key} type="button" onClick={() => { setType(key); reset(); }} className={chip(type === key)}>{label}</button>)}
              <span className="mx-1 hidden h-5 w-px bg-[#d4af5a]/20 sm:block" />
              {RISKS.map(([key, label]) => <button key={key} type="button" onClick={() => { setRisk(key); reset(); }} className={chip(risk === key)}>{label}</button>)}
              <input className={`${fieldClass} ml-auto max-w-[14rem] py-1.5`} placeholder="Search by name or symbol" value={query} onChange={(event) => { setQuery(event.target.value); reset(); }} />
            </div>

            {compare.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#d4af5a]/30 bg-[#d4af5a]/8 px-4 py-2.5 text-sm text-[#f1e8d6]">
                <span>{compare.length} chosen to compare{compare.length < 2 ? ". Pick at least one more." : "."}</span>
                <Link href={`/admin/market-desk/compare?keys=${compare.map(encodeURIComponent).join(",")}`} aria-disabled={compare.length < 2} className={`${ghostButtonClass} ${compare.length < 2 ? "pointer-events-none opacity-40" : ""}`}>Compare them</Link>
                <button type="button" className="text-xs text-[#a9b0a3] underline-offset-4 hover:underline" onClick={() => setCompare([])}>Clear</button>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d4af5a]/15 text-[10px] text-[#a9b0a3]">
                    <th className="w-16 px-2 py-2.5" aria-label="Watch and compare" />
                    {header("#", "rank")}
                    <th className="px-3 py-2.5 font-semibold uppercase tracking-[0.12em]">Asset</th>
                    <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-[0.12em]">Price</th>
                    {header("24h", "change_1d", "text-right")}
                    {header("7d", "change_7d", "text-right")}
                    {header("30d", "change_30d", "text-right")}
                    {header("90d", "change_90d", "text-right")}
                    {header("Market cap", "market_cap_gbp", "text-right")}
                    {header("Risk", "risk_score")}
                    <th className="px-3 py-2.5 font-semibold uppercase tracking-[0.12em]">Evidence score</th>
                    <th className="px-3 py-2.5 font-semibold uppercase tracking-[0.12em]">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.key} onClick={() => router.push(`/admin/market-desk/asset?key=${encodeURIComponent(row.key)}`)} className="cursor-pointer border-b border-[#d4af5a]/8 transition-colors hover:bg-[#d4af5a]/6">
                      <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                        <span className="flex items-center gap-1.5">
                          <button type="button" aria-label={watch.has(row.key) ? `Remove ${row.name} from the watchlist` : `Add ${row.name} to the watchlist`} aria-pressed={watch.has(row.key)} onClick={() => void toggleWatch(row.key)} className={`text-base leading-none ${watch.has(row.key) ? "text-[#e0c078]" : "text-[#a9b0a3]/50 hover:text-[#e0c078]"}`}>{watch.has(row.key) ? "★" : "☆"}</button>
                          <input type="checkbox" aria-label={`Compare ${row.name}`} checked={compare.includes(row.key)} disabled={!compare.includes(row.key) && compare.length >= 4} onChange={(event) => setCompare((current) => event.target.checked ? [...current, row.key].slice(0, 4) : current.filter((key) => key !== row.key))} className="h-3.5 w-3.5 accent-[#d4af5a]" />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#a9b0a3]">{row.rank}</td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(row.key)}`} onClick={(event) => event.stopPropagation()} className="flex items-center gap-2.5">
                          <Avatar row={row} />
                          <span className="min-w-0"><span className="block truncate font-semibold text-[#f1e8d6]">{row.name}</span><span className="text-[11px] text-[#a9b0a3]">{row.symbol} · {row.asset_type}</span></span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right text-[#f1e8d6]">{money.price(row.price_gbp)}</td>
                      {changeCell(row, "change_1d")}
                      {changeCell(row, "change_7d")}
                      {changeCell(row, "change_30d")}
                      {changeCell(row, "change_90d")}
                      <td className="px-3 py-3 text-right text-[#c9c6ba]">{money.compact(row.market_cap_gbp)}</td>
                      <td className="px-3 py-3"><RiskBadge label={row.risk_label} score={row.risk_score} /></td>
                      <td className="px-3 py-3"><ScoreBar score={row.score} view={row.view} /></td>
                      <td className="px-3 py-3" title={row.asset_type === "crypto" ? "Last 7 days" : "Last 90 days"}><Sparkline values={row.history} width={110} height={32} /><span className="block text-[9px] text-[#a9b0a3]/70">{row.asset_type === "crypto" ? "7 days" : "90 days"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 ? <p className="mt-4 text-sm text-[#a9b0a3]">{list === "watch" ? "Nothing on your watchlist yet. Press the star beside any asset to add it." : "Nothing matches those filters."}</p> : null}

            {visible.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#a9b0a3]">
                <span>{current * pageSize + 1} to {Math.min(visible.length, current * pageSize + pageSize)} of {visible.length}</span>
                <span className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5">Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); reset(); }} className="rounded-lg border border-[#d4af5a]/40 bg-[#0a100c] px-2 py-1 text-[#f1e8d6]">{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                  <button type="button" className={ghostButtonClass} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
                  <span>Page {current + 1} of {pages}</span>
                  <button type="button" className={ghostButtonClass} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
                </span>
              </div>
            ) : null}
            <p className="mt-4 text-[11px] leading-relaxed text-[#a9b0a3]">Gainers and Losers use the timeframe you pick. Prices are converted from pounds at today&apos;s rate, so a dollar or euro price is a conversion, not a quote from a dollar market. Crypto has no 90-day change here, so its trend uses 7, 30 and 200 days. Click any row for the full page with the chart, our reasoning and the sources.</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
