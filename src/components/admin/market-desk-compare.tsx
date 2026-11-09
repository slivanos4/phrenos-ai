"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Compare, CompareAsset } from "@/lib/market-desk/compare";
import type { SearchHit } from "@/lib/market-desk/types";
import { RiskBadge, api, eyebrowClass, fieldClass, ghostButtonClass, microButtonClass, panelClass, pct, tone } from "@/components/admin/market-desk-ui";
import { makeMoney } from "@/components/admin/market-desk-stats";

const COLOURS = ["#e0c078", "#8fbf9f", "#a9b8e8", "#e8a0c0"];
const RANGES: [string, number][] = [["1M", 21], ["3M", 63], ["6M", 126], ["1Y", 260]];

/** Every asset rebased to 100 at the start of the chosen range, so very different prices can be compared by how they moved. */
function RebasedChart({ compare, range }: { compare: Compare; range: number }) {
  const count = Math.min(range, compare.dates.length);
  const dates = compare.dates.slice(-count);
  const lines = compare.assets.map((asset, index) => {
    const closes = compare.closes[asset.key].slice(-count);
    return { asset, colour: COLOURS[index], values: closes.map((value) => (value / closes[0]) * 100) };
  });
  const width = 800;
  const height = 300;
  const pad = { left: 38, right: 10, top: 12, bottom: 22 };
  const all = lines.flatMap((line) => line.values);
  const min = Math.min(...all, 100);
  const max = Math.max(...all, 100);
  const span = max - min || 1;
  const x = (i: number) => pad.left + (i / Math.max(1, dates.length - 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - min) / span) * (height - pad.top - pad.bottom);
  const ticks = [min, (min + max) / 2, max];
  const label = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Performance of each asset, rebased to 100">
      {ticks.map((tick) => <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#d4af5a" strokeOpacity="0.12" /><text x={pad.left - 6} y={y(tick) + 3} fontSize="10" fill="#a9b0a3" textAnchor="end">{tick.toFixed(0)}</text></g>)}
      <line x1={pad.left} x2={width - pad.right} y1={y(100)} y2={y(100)} stroke="#a9b0a3" strokeOpacity="0.5" strokeDasharray="4 4" />
      {lines.map((line) => <polyline key={line.asset.key} points={line.values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ")} fill="none" stroke={line.colour} strokeWidth="1.9" strokeLinejoin="round" />)}
      <text x={pad.left} y={height - 6} fontSize="10" fill="#a9b0a3">{label(dates[0])}</text>
      <text x={width - pad.right} y={height - 6} fontSize="10" fill="#a9b0a3" textAnchor="end">{label(dates[dates.length - 1])}</text>
    </svg>
  );
}

const corrWords = (value: number | null) => value === null ? "n/a" : value > 0.7 ? "Move closely together" : value > 0.3 ? "Tend to move together" : value > -0.3 ? "Mostly independent" : "Tend to move opposite";

type Row = { label: string; hint?: string; cell: (asset: CompareAsset) => React.ReactNode; best?: (assets: CompareAsset[]) => string | null };

export function ComparePanel({ initialKeys }: { initialKeys: string[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState<string[]>(initialKeys.slice(0, 4));
  const [data, setData] = useState<Compare | null>(null);
  const [error, setError] = useState<string | null>(initialKeys.length < 2 ? "Pick at least two assets below." : null);
  const [loading, setLoading] = useState(initialKeys.length >= 2);
  const [range, setRange] = useState(126);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const joined = keys.join(",");
  useEffect(() => {
    if (keys.length < 2) return;
    let cancelled = false;
    void api<{ compare: Compare }>(`/api/market-desk/compare?keys=${encodeURIComponent(joined)}`)
      .then((result) => { if (!cancelled) { setData(result.compare); setError(null); } })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  function setList(next: string[]) {
    setKeys(next);
    setLoading(next.length >= 2);
    if (next.length < 2) { setData(null); setError("Pick at least two assets below."); }
    router.replace(`/admin/market-desk/compare?keys=${next.map(encodeURIComponent).join(",")}`, { scroll: false });
  }

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

  const rows: Row[] = useMemo(() => {
    const best = (pick: (a: CompareAsset) => number | null, high = true) => (assets: CompareAsset[]) => {
      const valid = assets.filter((a) => pick(a) !== null);
      if (valid.length < 2) return null;
      return valid.reduce((a, b) => ((pick(a) as number) >= (pick(b) as number) === high ? a : b)).key;
    };
    const change = (field: keyof CompareAsset) => (a: CompareAsset) => <span className={tone(a[field] as number | null)}>{pct(a[field] as number | null)}</span>;
    return [
      { label: "Price", cell: (a) => `${a.price >= 1000 ? a.price.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : a.price >= 1 ? a.price.toFixed(2) : a.price.toPrecision(3)} ${a.currency}` },
      { label: "1 day", cell: change("change_1d"), best: best((a) => a.change_1d) },
      { label: "7 days", cell: change("change_7d"), best: best((a) => a.change_7d) },
      { label: "30 days", cell: change("change_30d"), best: best((a) => a.change_30d) },
      { label: "90 days", cell: change("change_90d"), best: best((a) => a.change_90d) },
      { label: "1 year", cell: change("return_1y"), best: best((a) => a.return_1y) },
      { label: "Price swings (30 days)", hint: "Lower is calmer", cell: (a) => (a.vol_30d === null ? "n/a" : `${(a.vol_30d * 100).toFixed(0)}% a year`), best: best((a) => a.vol_30d, false) },
      { label: "Worst fall in a year", hint: "Closer to zero is better", cell: (a) => <span className="text-[#e8b4a0]">{pct(a.drawdown_1y, false)}</span>, best: best((a) => a.drawdown_1y) },
      { label: "Against 200-day average", cell: change("vs_sma200"), best: best((a) => a.vs_sma200) },
      { label: "Risk", hint: "Lower is safer", cell: (a) => <RiskBadge label={a.risk_label} score={a.risk_score} />, best: best((a) => a.risk_score, false) },
      { label: "Our evidence score", hint: "Out of 100", cell: (a) => (a.score === null ? "Not ranked" : `${a.score} · ${a.view}`), best: best((a) => a.score) },
      { label: "Market cap", cell: (a) => makeMoney("GBP", null).compact(a.market_cap_gbp) },
    ];
  }, []);

  const name = (key: string) => data?.assets.find((a) => a.key === key)?.symbol ?? key;

  return (
    <div className="space-y-5">
      <Link href="/admin/market-desk" className="text-[11px] font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline">← Back to Market Desk</Link>
      <header>
        <h1 className="font-serif text-3xl text-[#f1e8d6]">Compare</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#a9b0a3]">Up to four assets side by side. The chart starts every line at 100, so a £5 coin and a £500 share can be compared by how each moved. It shows the past, not what comes next.</p>
      </header>

      <section className={panelClass}>
        <div className="flex flex-wrap gap-2">
          {keys.map((key, index) => (
            <span key={key} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-[#f1e8d6]" style={{ borderColor: COLOURS[index] }}>
              <span className="h-2 w-2 rounded-full" style={{ background: COLOURS[index] }} />{data?.assets.find((a) => a.key === key)?.name ?? key}
              <button type="button" aria-label={`Remove ${key}`} onClick={() => setList(keys.filter((k) => k !== key))} className="text-[#a9b0a3] hover:text-[#e8b4a0]">✕</button>
            </span>
          ))}
        </div>
        {keys.length < 4 ? (
          <div className="mt-4">
            <div className="flex gap-2">
              <input className={`${fieldClass} max-w-xs`} placeholder="Add an asset: name or symbol" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} />
              <button type="button" className={ghostButtonClass} disabled={searching || query.trim().length < 2} onClick={() => void search()}>{searching ? "Searching..." : "Search"}</button>
            </div>
            {hits.length > 0 ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {hits.filter((hit) => !keys.includes(hit.key)).map((hit) => (
                  <li key={hit.key} className="flex items-center justify-between gap-2 rounded-xl border border-[#d4af5a]/20 px-3 py-2 text-sm text-[#f1e8d6]">
                    <span className="min-w-0 truncate">{hit.name} <span className="text-[11px] text-[#a9b0a3]">{hit.symbol} · {hit.type}</span></span>
                    <button type="button" className={microButtonClass} onClick={() => { setList([...keys, hit.key]); setHits([]); setQuery(""); }}>Add</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm text-[#e8b4a0]">{error}</p> : null}
      {loading ? <p className="text-sm text-[#a9b0a3]">Loading price history for each asset...</p> : null}

      {data && keys.length >= 2 ? (
        <>
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={eyebrowClass}>How each has moved (start = 100)</p>
              <div className="flex gap-1.5">{RANGES.map(([label, days]) => <button key={label} type="button" onClick={() => setRange(days)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${range === days ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{label}</button>)}</div>
            </div>
            <div className="mt-3"><RebasedChart compare={data} range={range} /></div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#c9c6ba]">
              {data.assets.map((asset, index) => {
                const closes = data.closes[asset.key].slice(-Math.min(range, data.dates.length));
                const move = closes[closes.length - 1] / closes[0] - 1;
                return <li key={asset.key}><span className="mr-1.5 inline-block h-0.5 w-4 align-middle" style={{ background: COLOURS[index] }} />{asset.symbol} <span className={tone(move)}>{pct(move)}</span></li>;
              })}
            </ul>
            <p className="mt-2 text-[11px] text-[#a9b0a3]">Uses the {data.dates.length} days on which every chosen asset has a price. Crypto trades every day, shares do not, so weekend moves are not shown when the two are mixed.</p>
          </section>

          <section className={panelClass}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d4af5a]/15">
                    <th className="py-2 pr-3" />
                    {data.assets.map((asset, index) => <th key={asset.key} className="px-3 py-2 font-semibold"><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(asset.key)}`} className="hover:text-[#e0c078]" style={{ color: COLOURS[index] }}>{asset.name}</Link><span className="block text-[11px] font-normal text-[#a9b0a3]">{asset.symbol} · {asset.asset_type}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const best = row.best?.(data.assets) ?? null;
                    return (
                      <tr key={row.label} className="border-b border-[#d4af5a]/8">
                        <td className="py-2.5 pr-3 text-[11px] font-semibold tracking-[0.1em] text-[#a9b0a3] uppercase">{row.label}{row.hint ? <span className="block text-[10px] font-normal normal-case tracking-normal text-[#a9b0a3]/70">{row.hint}</span> : null}</td>
                        {data.assets.map((asset) => <td key={asset.key} className={`px-3 py-2.5 text-[#f1e8d6] ${best === asset.key ? "bg-[#8fbf9f]/10" : ""}`}>{row.cell(asset)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-[#a9b0a3]">The shaded cell is the strongest of the group on that line. Strongest on one line does not make it a better choice overall.</p>
          </section>

          <section className={panelClass}>
            <p className={eyebrowClass}>Do they move together?</p>
            <ul className="mt-3 space-y-2 text-sm text-[#d5d0c1]">
              {data.correlation.map((pair) => <li key={`${pair.a}${pair.b}`}><span className="font-semibold text-[#f1e8d6]">{name(pair.a)} and {name(pair.b)}</span>: {pair.value === null ? "not enough shared history" : `${pair.value.toFixed(2)}, ${corrWords(pair.value).toLowerCase()}`}</li>)}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-[#a9b0a3]">The figure runs from -1 (opposite) to 1 (identical), measured on day-to-day moves. Holding assets that move together gives less protection when prices fall.</p>
          </section>
          {data.skipped.length > 0 ? <p className="text-xs text-[#e0c078]">Left out because no data came back: {data.skipped.map((s) => s.key).join(", ")}.</p> : null}
        </>
      ) : null}
    </div>
  );
}
