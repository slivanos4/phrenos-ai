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

function riskBand(label: string | null): string {
  return label === "Very low" || label === "Low" ? "lower" : label === "Moderate" ? "moderate" : "higher";
}

type SortKey = "rank" | "change_1d" | "change_7d" | "change_30d" | "change_90d" | "market_cap_gbp" | "risk_score";

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

export function RankingsTab({ setError, setNotice }: { setError: (value: string | null) => void; setNotice: (value: string | null) => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [shown, setShown] = useState(50);

  useEffect(() => {
    void api<{ rows: RankingRow[] }>("/api/market-desk/rankings")
      .then((result) => setRows(result.rows))
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [setError]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const result = await api<{ ranked: number; noted: number }>("/api/market-desk/rankings", { method: "POST" });
      setRows((await api<{ rows: RankingRow[] }>("/api/market-desk/rankings")).rows);
      setNotice(`Rescanned ${result.ranked} assets and rewrote ${result.noted} research notes.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The rescan failed. Try again in a minute.");
    } finally {
      setRefreshing(false);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) =>
      (type === "all" || row.asset_type === type) &&
      (risk === "all" || riskBand(row.risk_label) === risk) &&
      (!needle || row.name.toLowerCase().includes(needle) || row.symbol.toLowerCase().includes(needle)),
    );
    return [...filtered].sort((a, b) => {
      const x = a[sort.key] ?? (sort.dir === 1 ? Infinity : -Infinity);
      const y = b[sort.key] ?? (sort.dir === 1 ? Infinity : -Infinity);
      return (Number(x) - Number(y)) * sort.dir;
    });
  }, [rows, type, risk, query, sort]);

  const top = rows[0];
  const bestLower = rows.find((row) => riskBand(row.risk_label) === "lower");
  const bestHigher = rows.find((row) => riskBand(row.risk_label) === "higher");

  function header(label: string, key: SortKey, className = "") {
    const active = sort.key === key;
    return (
      <th className={`px-3 py-2.5 font-semibold ${className}`}>
        <button type="button" onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : key === "rank" || key === "risk_score" ? 1 : -1 })} className={`uppercase tracking-[0.12em] hover:text-[#e0c078] ${active ? "text-[#e0c078]" : ""}`}>
          {label}{active ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
        </button>
      </th>
    );
  }

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
        {rows[0] ? <p className="mt-2 text-[11px] text-[#a9b0a3]">{rows.length} assets · updated {when(rows[0].updated_at)} · refreshed every morning, notes rewritten on Mondays</p> : null}
      </section>

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
            <div className="flex flex-wrap items-center gap-2">
              {TYPES.map(([key, label]) => <button key={key} type="button" onClick={() => setType(key)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${type === key ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{label}</button>)}
              <span className="mx-1 hidden h-5 w-px bg-[#d4af5a]/20 sm:block" />
              {RISKS.map(([key, label]) => <button key={key} type="button" onClick={() => setRisk(key)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${risk === key ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{label}</button>)}
              <input className={`${fieldClass} ml-auto max-w-[14rem] py-1.5`} placeholder="Filter by name" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d4af5a]/15 text-[10px] text-[#a9b0a3]">
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
                    <th className="px-3 py-2.5 font-semibold uppercase tracking-[0.12em]">Last 90 days</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice(0, shown).map((row) => (
                    <tr key={row.key} onClick={() => router.push(`/admin/market-desk/asset?key=${encodeURIComponent(row.key)}`)} className="cursor-pointer border-b border-[#d4af5a]/8 transition-colors hover:bg-[#d4af5a]/6">
                      <td className="px-3 py-3 text-[#a9b0a3]">{row.rank}</td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(row.key)}`} onClick={(event) => event.stopPropagation()} className="flex items-center gap-2.5">
                          <Avatar row={row} />
                          <span className="min-w-0"><span className="block truncate font-semibold text-[#f1e8d6]">{row.name}</span><span className="text-[11px] text-[#a9b0a3]">{row.symbol} · {row.asset_type}</span></span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right text-[#f1e8d6]">{gbpPrice(row.price_gbp)}</td>
                      <td className={`px-3 py-3 text-right ${tone(row.change_1d)}`}>{pct(row.change_1d)}</td>
                      <td className={`px-3 py-3 text-right ${tone(row.change_7d)}`}>{pct(row.change_7d)}</td>
                      <td className={`px-3 py-3 text-right ${tone(row.change_30d)}`}>{pct(row.change_30d)}</td>
                      <td className={`px-3 py-3 text-right ${tone(row.change_90d)}`}>{pct(row.change_90d)}</td>
                      <td className="px-3 py-3 text-right text-[#c9c6ba]">{gbpCompact(row.market_cap_gbp)}</td>
                      <td className="px-3 py-3"><RiskBadge label={row.risk_label} score={row.risk_score} /></td>
                      <td className="px-3 py-3"><ScoreBar score={row.score} view={row.view} /></td>
                      <td className="px-3 py-3"><Sparkline values={row.history} width={110} height={32} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 ? <p className="mt-4 text-sm text-[#a9b0a3]">Nothing matches those filters.</p> : null}
            {visible.length > shown ? <div className="mt-4 text-center"><button type="button" className={ghostButtonClass} onClick={() => setShown(shown + 50)}>Show more ({visible.length - shown} left)</button></div> : null}
            <p className="mt-4 text-[11px] leading-relaxed text-[#a9b0a3]">Prices in pounds. Crypto has no 90-day change here, so its trend uses 7, 30 and 200 days. Click any row for the full page with the chart, our reasoning and the sources.</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
