"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Detail } from "@/lib/market-desk/detail";
import { Avatar, ScoreBar, gbpCompact, gbpPrice } from "@/components/admin/market-desk-rankings";
import {
  Disclaimer,
  RiskBadge,
  RiskBanner,
  microButtonClass,
  RiskMeter,
  api,
  eyebrowClass,
  ghostButtonClass,
  panelClass,
  pct,
  price,
  tone,
  when,
} from "@/components/admin/market-desk-ui";
import { makeMoney, useMarketStats, type Currency } from "@/components/admin/market-desk-stats";
import { PulseCard } from "@/components/admin/market-desk-pulse";
import type { HistoryRow } from "@/lib/market-desk/facts";
import { companyCheck, priceVsBusiness, type Fundamentals } from "@/lib/market-desk/fundamentals";
import { TONE_CLASS } from "@/lib/market-desk/outlook-core";
import type { ViewRecord } from "@/lib/market-desk/views";

const LINE_COLOURS = { buy: "#e0c078", high: "#8fbf9f", warn: "#e8b4a0", avg: "#a9b0a3" } as const;

const RANGES: [string, number][] = [["7D", 7], ["30D", 30], ["90D", 90], ["1Y", 260]];

/** Price line with the key levels marked, a range picker, and a crosshair that shows the date and price under the pointer. */
function Chart({ detail }: { detail: Detail }) {
  const [range, setRange] = useState(260);
  const [hover, setHover] = useState<number | null>(null);
  const closes = detail.chart.closes.slice(-range);
  const dates = detail.chart.dates.slice(-range);
  const width = 1000;
  const height = 340;
  const pad = { left: 8, right: 8, top: 12, bottom: 22 };
  const lines = range >= 90 ? detail.lines : [];
  const levels = lines.map((line) => line.value);
  const min = Math.min(...closes, ...levels);
  const max = Math.max(...closes, ...levels);
  const span = max - min || 1;
  const x = (index: number) => pad.left + (index / Math.max(1, closes.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
  const points = closes.map((close, index) => `${x(index).toFixed(1)},${y(close).toFixed(1)}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${points} ${width - pad.right},${height - pad.bottom}`;
  const up = closes[closes.length - 1] >= closes[0];
  const colour = up ? "#8fbf9f" : "#e8b4a0";
  const label = (value: string) => new Date(value).toLocaleDateString("en-GB", range <= 30 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" });
  const longDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const at = Math.min(hover ?? -1, closes.length - 1);
  const active = hover !== null && at >= 0;
  const previous = active && at > 0 ? closes[at] / closes[at - 1] - 1 : null;
  const sinceStart = active ? closes[at] / closes[0] - 1 : null;
  const fromHigh = active ? closes[at] / Math.max(...closes.slice(0, at + 1)) - 1 : null;
  const left = active ? (x(at) / width) * 100 : 0;

  function move(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * width;
    const index = Math.round(((svgX - pad.left) / (width - pad.left - pad.right)) * (closes.length - 1));
    setHover(Math.max(0, Math.min(closes.length - 1, index)));
  }

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {RANGES.map(([name, days]) => (
          <button key={name} type="button" onClick={() => { setRange(days); setHover(null); }} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${range === days ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{name}</button>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full touch-pan-y outline-none"
          role="img"
          aria-label={`Price of ${detail.asset.name}. Move the pointer or use the arrow keys to read a price.`}
          tabIndex={0}
          onPointerMove={(event) => move(event.clientX, event.currentTarget)}
          onPointerDown={(event) => move(event.clientX, event.currentTarget)}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); setHover((current) => Math.max(0, (current ?? closes.length - 1) - 1)); }
            if (event.key === "ArrowRight") { event.preventDefault(); setHover((current) => Math.min(closes.length - 1, (current ?? closes.length - 1) + 1)); }
            if (event.key === "Escape") setHover(null);
          }}
        >
          <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={colour} stopOpacity="0.25" /><stop offset="100%" stopColor={colour} stopOpacity="0" /></linearGradient></defs>
          <polygon points={area} fill="url(#fill)" />
          {lines.map((line) => (
            <line key={line.label} x1={pad.left} x2={width - pad.right} y1={y(line.value)} y2={y(line.value)} stroke={LINE_COLOURS[line.tone]} strokeWidth="1" strokeDasharray="5 4" opacity="0.85" />
          ))}
          <polyline points={points} fill="none" stroke={colour} strokeWidth="1.8" strokeLinejoin="round" />
          {active ? (
            <>
              <line x1={x(at)} x2={x(at)} y1={pad.top} y2={height - pad.bottom} stroke="#f1e8d6" strokeOpacity="0.45" strokeWidth="1" />
              <circle cx={x(at)} cy={y(closes[at])} r="4.5" fill="#0a100c" stroke={colour} strokeWidth="2" />
            </>
          ) : null}
          <text x={pad.left} y={height - 6} fontSize="10" fill="#a9b0a3">{label(dates[0])}</text>
          <text x={width - pad.right} y={height - 6} fontSize="10" fill="#a9b0a3" textAnchor="end">{label(dates[dates.length - 1])}</text>
        </svg>
        {active ? (
          <div
            className="pointer-events-none absolute top-2 z-10 w-48 rounded-xl border border-[#d4af5a]/40 bg-[#0a100c]/95 px-3 py-2 text-xs shadow-lg"
            style={{ left: `${left}%`, transform: left > 60 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            role="status"
          >
            <p className="text-[11px] text-[#a9b0a3]">{longDate(dates[at])}</p>
            <p className="mt-0.5 font-serif text-lg text-[#f1e8d6]">{price(closes[at], detail.asset.currency)}</p>
            <dl className="mt-1 space-y-0.5 text-[11px]">
              {previous !== null ? <div className="flex justify-between gap-2"><dt className="text-[#a9b0a3]">That day</dt><dd className={tone(previous)}>{pct(previous)}</dd></div> : null}
              <div className="flex justify-between gap-2"><dt className="text-[#a9b0a3]">Since {label(dates[0])}</dt><dd className={tone(sinceStart)}>{pct(sinceStart)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[#a9b0a3]">From its high so far</dt><dd className={tone(fromHigh)}>{pct(fromHigh, false)}</dd></div>
            </dl>
          </div>
        ) : null}
      </div>
      {lines.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#c9c6ba]">
          {lines.map((line) => (
            <li key={line.label}><span className="mr-1.5 inline-block h-0.5 w-4 align-middle" style={{ background: LINE_COLOURS[line.tone] }} />{line.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 2 ? "just now" : minutes < 90 ? `${minutes} minutes ago` : minutes < 2880 ? `${Math.round(minutes / 60)} hours ago` : `${Math.round(minutes / 1440)} days ago`;
};

/** Rewrites the research note and outlook from the latest prices, company results and headlines. */
function useRefreshView(assetKey: string, onView: (view: ViewRecord) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      onView((await api<{ view: ViewRecord }>("/api/market-desk/view", { method: "POST", json: { key: assetKey } })).view);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh just now.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, refresh };
}

/**
 * Could the trend stop or turn? A plain reading of the price pattern, what happened after similar episodes in the past, and what to watch.
 * It describes. It does not predict, and it never names a price.
 */
function OutlookCard({ detail, onView }: { detail: Detail; onView: (view: ViewRecord) => void }) {
  const { outlook, odds, view } = detail;
  const { busy, error, refresh } = useRefreshView(detail.asset.key, onView);
  const fresh = view && view.updated_at ? view : null;
  return (
    <section id="outlook" className={`${panelClass} scroll-mt-24`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={eyebrowClass}>Outlook: could the trend turn?</p>
          <p className="mt-1 text-xs text-[#a9b0a3]">A reading of the chart and of past episodes. Not a prediction: nobody can know what happens next.</p>
        </div>
        <button type="button" className={microButtonClass} disabled={busy} onClick={() => void refresh()}>{busy ? "Writing, about 20 seconds..." : "Refresh outlook"}</button>
      </div>
      {error ? <p className="mt-3 text-sm text-[#e8b4a0]">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASS[outlook.tone]}`}>{outlook.label}</span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#e6dfce]">{outlook.comment}</p>
      </div>

      {fresh?.outlook_text ? (
        <div className="mt-4 rounded-xl border border-[#d4af5a]/25 bg-[#0a100c]/50 p-4">
          <p className="text-sm leading-relaxed text-[#e6dfce]">{fresh.outlook_text}</p>
          <p className="mt-2 text-[11px] text-[#a9b0a3]">Written by AI {ago(fresh.updated_at)} from the price pattern, the record below, the company&apos;s results and recent headlines.</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-[#a9b0a3]">Press Refresh outlook for a fuller paragraph that also weighs today&apos;s news and the company&apos;s results.</p>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">What would change the picture</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#d5d0c1]">{outlook.turn_watch.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">What happened after similar episodes</p>
          {odds.condition ? (
            <div className="mt-2 text-sm leading-relaxed text-[#d5d0c1]">
              <p>Over the last {odds.years} years there were <strong className="text-[#f1e8d6]">{odds.episodes}</strong> separate {odds.condition}. Twenty trading days later, <strong className="text-[#f1e8d6]">{odds.share_up === null ? "n/a" : `${Math.round(odds.share_up * 100)}%`}</strong> of them were higher, with a typical change of <strong className={tone(odds.median)}>{pct(odds.median)}</strong> (the weaker tenth ended {pct(odds.p10)} or worse, the stronger tenth {pct(odds.p90)} or better).</p>
              <p className="mt-2 text-xs text-[#a9b0a3]">For comparison, across every day in the same history it was higher 20 days later {odds.base_share_up === null ? "n/a" : `${Math.round(odds.base_share_up * 100)}%`} of the time.</p>
              {!odds.reliable ? <p className="mt-2 rounded-lg border border-[#e0c078]/40 bg-[#e0c078]/8 px-3 py-2 text-xs text-[#e0c078]">Only {odds.episodes} similar cases, so treat this as a loose guide and not a pattern.</p> : null}
            </div>
          ) : <p className="mt-2 text-sm text-[#a9b0a3]">There is no unusual recent move to compare with past episodes. Across all {odds.years} years of history, it was higher 20 trading days later {odds.base_share_up === null ? "n/a" : `${Math.round(odds.base_share_up * 100)}%`} of the time.</p>}
        </div>
      </div>
    </section>
  );
}

const CHECK_TONE: Record<string, string> = TONE_CLASS;

/** The business behind a share: results, valuation and what analysts as a group think. Shown beside the price score, which ignores it. */
function CompanyCheck({ fundamentals, change30 }: { fundamentals: Fundamentals; change30: number | null }) {
  const lines = companyCheck(fundamentals);
  const clash = priceVsBusiness(fundamentals, change30);
  const a = fundamentals.analysts;
  const eps = (value: number | null) => (value === null ? "n/a" : value.toFixed(2));
  return (
    <section id="company" className={`${panelClass} scroll-mt-24`}>
      <p className={eyebrowClass}>Company check: how the business is doing</p>
      <p className="mt-1 text-xs text-[#a9b0a3]">From the company&apos;s own reported results. Our score looks only at price, so this gives the other half of the picture.</p>
      {clash ? <p className="mt-4 rounded-xl border border-[#e0c078]/45 bg-[#e0c078]/8 px-4 py-3 text-sm leading-relaxed text-[#e6dfce]">{clash}</p> : null}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {lines.map((line) => (
          <li key={line.label} className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold tracking-[0.12em] text-[#a9b0a3] uppercase">{line.label}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CHECK_TONE[line.tone]}`}>{line.verdict}</span></div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#c9c6ba]">{line.detail}</p>
          </li>
        ))}
      </ul>
      {fundamentals.earnings.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">Profit per share, against what analysts expected</p>
          <table className="mt-2 w-full min-w-[420px] text-left text-sm">
            <thead><tr className="border-b border-[#d4af5a]/15 text-[10px] uppercase tracking-[0.12em] text-[#a9b0a3]"><th className="py-1.5 pr-3 font-semibold">Quarter ended</th><th className="px-3 py-1.5 text-right font-semibold">Reported</th><th className="px-3 py-1.5 text-right font-semibold">Expected</th><th className="px-3 py-1.5 text-right font-semibold">Difference</th></tr></thead>
            <tbody>{[...fundamentals.earnings].reverse().map((row) => <tr key={row.quarter} className="border-b border-[#d4af5a]/8"><td className="py-1.5 pr-3 text-[#f1e8d6]">{row.quarter}</td><td className="px-3 py-1.5 text-right text-[#f1e8d6]">{eps(row.actual)}</td><td className="px-3 py-1.5 text-right text-[#c9c6ba]">{eps(row.estimate)}</td><td className={`px-3 py-1.5 text-right ${tone(row.surprise)}`}>{pct(row.surprise)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {a ? (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">What analysts think (their opinion, not ours)</p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#0a100c]" role="img" aria-label={`${a.positive} positive, ${a.neutral} neutral, ${a.negative} negative`}>
              <span className="block bg-[#8fbf9f]" style={{ width: `${(a.positive / a.count) * 100}%` }} />
              <span className="block bg-[#e0c078]" style={{ width: `${(a.neutral / a.count) * 100}%` }} />
              <span className="block bg-[#e8b4a0]" style={{ width: `${(a.negative / a.count) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#c9c6ba]">{a.positive} of {a.count} rate it positively, {a.neutral} neutral, {a.negative} negatively.{a.target_vs_price !== null ? ` Their average price target is ${pct(Math.abs(a.target_vs_price), false)} ${a.target_vs_price >= 0 ? "above" : "below"} the current price.` : ""} Analysts are often slow to react and often wrong, so treat this as one input.</p>
          </div>
        ) : null}
        {fundamentals.next_earnings ? <div><p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">Next results</p><p className="mt-2 text-sm text-[#f1e8d6]">{new Date(fundamentals.next_earnings).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p><p className="mt-1 text-xs text-[#a9b0a3]">Results days often move a price sharply in either direction.</p></div> : null}
      </div>
      <p className="mt-4 text-[11px] text-[#a9b0a3]">Source: Yahoo Finance, which can lag the company&apos;s own announcements.</p>
    </section>
  );
}

function ResearchView({ ranking, assetKey, view, onView }: { ranking: NonNullable<Detail["ranking"]>; assetKey: string; view: ViewRecord | null; onView: (view: ViewRecord) => void }) {
  const { busy, error, refresh } = useRefreshView(assetKey, onView);
  const note = view?.note || ranking.note;
  const noteDate = view?.note ? view.updated_at : ranking.note_updated_at;
  return (
    <section className="rounded-2xl border border-[#d4af5a]/40 bg-[linear-gradient(135deg,rgba(212,175,90,0.10),rgba(16,28,20,0.9))] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className={eyebrowClass}>Our research view</p>
          <p className="mt-1 font-serif text-2xl text-[#f1e8d6]">#{ranking.rank} in our rankings</p>
          <p className="text-xs text-[#a9b0a3]">Evidence score from 0 to 100, with the risk shown separately</p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreBar score={ranking.score} view={ranking.view} />
          <RiskBadge label={ranking.risk_label} score={ranking.risk_score} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#a9b0a3]">Score and rank as of the {when(ranking.updated_at)} scan, which reruns every morning.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">Research note{noteDate ? <span className="ml-2 font-normal normal-case tracking-normal text-[#a9b0a3]">written {ago(noteDate)}</span> : null}</p>
        <button type="button" className={microButtonClass} disabled={busy} onClick={() => void refresh()}>{busy ? "Writing, about 20 seconds..." : "Refresh research view"}</button>
      </div>
      {error ? <p className="mt-2 text-sm text-[#e8b4a0]">{error}</p> : null}
      {note ? <p className="mt-2 text-sm leading-relaxed text-[#e6dfce]">{note}</p> : <p className="mt-2 text-sm text-[#a9b0a3]">No note yet. Press Refresh research view to write one from today&apos;s prices, news and company results.</p>}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8fbf9f] uppercase">Why it ranks here</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#d5d0c1]">{ranking.strengths.length ? ranking.strengths.map((line) => <li key={line}><span className="mr-1.5 text-[#8fbf9f]">✓</span>{line}</li>) : <li className="text-[#a9b0a3]">Little in its favour in the data right now.</li>}</ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e8b4a0] uppercase">What argues against it</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[#d5d0c1]">{ranking.concerns.map((line) => <li key={line}><span className="mr-1.5 text-[#e8b4a0]">!</span>{line}</li>)}</ul>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#e0c078] uppercase">What would change this view</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#d5d0c1]">{ranking.watch_for.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-[11px] font-semibold tracking-[0.16em] text-[#a9b0a3] uppercase">How the score is worked out</summary>
        <p className="mt-2 text-xs leading-relaxed text-[#a9b0a3]">55% is how much it has gained recently compared with how bumpy the ride was, ranked against every asset scanned. 20% is whether it sits above its 50-day and 200-day averages. 15% is whether the 1-month and longer trends agree. 10% is smart-money signals such as insider buying. A sharp recent surge or a very small crypto market cuts the score, because both are riskier. The score never looks at company earnings or valuation, and it says nothing about the future.</p>
      </details>
      <p className="mt-4 text-[11px] text-[#a9b0a3]">Research, not a recommendation to buy or sell. Decide for yourself, and never invest money you cannot afford to lose.</p>
    </section>
  );
}


const SECTIONS: [string, string][] = [["price", "Price"], ["stats", "Stats"], ["pulse", "Pulse"], ["convert", "Converter"], ["outlook", "Outlook"], ["company", "Company"], ["research", "Our view"], ["history", "History"], ["about", "About"], ["news", "News"], ["sources", "Sources"]];

/** Jump links to each part of the page, like the section bar on a CoinGecko or Kraken asset page. */
function SectionNav({ hasResearch, hasAbout, hasCompany }: { hasResearch: boolean; hasAbout: boolean; hasCompany: boolean }) {
  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-1.5">
      {SECTIONS.filter(([id]) => (id !== "research" || hasResearch) && (id !== "about" || hasAbout) && (id !== "company" || hasCompany)).map(([id, label]) => (
        <a key={id} href={`#${id}`} className="rounded-full border border-[#d4af5a]/25 px-3 py-1 text-[11px] font-semibold text-[#a9b0a3] transition-colors hover:border-[#d4af5a]/60 hover:text-[#e0c078]">{label}</a>
      ))}
    </nav>
  );
}

const units = (value: number | null | undefined) => (value === null || value === undefined ? "n/a" : value >= 1e9 ? `${(value / 1e9).toFixed(2)}bn` : value >= 1e6 ? `${(value / 1e6).toFixed(2)}m` : value.toLocaleString("en-GB", { maximumFractionDigits: 0 }));
const dateText = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Turns an amount of the asset into pounds, dollars or euros, and back. Uses today's rates, so it is a conversion, not a quote. */
function Converter({ priceGbp, symbol }: { priceGbp: number | null; symbol: string }) {
  const stats = useMarketStats();
  const [amount, setAmount] = useState("1");
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [reverse, setReverse] = useState(false);
  const rate = currency === "GBP" ? 1 : (stats?.rates[currency] ?? null);
  const money = makeMoney(currency, stats?.rates ?? null);
  const n = Number(amount.replace(/,/g, ""));
  const ready = priceGbp !== null && rate !== null && Number.isFinite(n) && n >= 0;
  const result = !ready ? null : reverse ? n / (priceGbp! * rate!) : money.price(n * priceGbp!);
  return (
    <section id="convert" className={`${panelClass} scroll-mt-24`}>
      <p className={eyebrowClass}>Converter</p>
      <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a9b0a3]">{reverse ? `Amount in ${currency}` : `Amount of ${symbol}`}</span>
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-xl border border-[#d4af5a]/55 bg-[#0a100c]/70 px-4 py-2.5 text-sm text-[#f1e8d6] outline-none focus:border-[#e0c078]" />
        </label>
        <button type="button" onClick={() => setReverse((value) => !value)} aria-label="Swap direction" className={ghostButtonClass}>⇄</button>
        <div className="space-y-1.5">
          <span className="text-[11px] text-[#a9b0a3]">{reverse ? `Worth in ${symbol}` : `Worth in ${currency}`}</span>
          <p className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/40 px-4 py-2.5 text-sm text-[#f1e8d6]">{result === null ? "n/a" : typeof result === "number" ? result.toLocaleString("en-GB", { maximumSignificantDigits: 6 }) : result}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">{(["GBP", "USD", "EUR"] as Currency[]).map((code) => <button key={code} type="button" disabled={code !== "GBP" && !stats?.rates[code]} onClick={() => setCurrency(code)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold disabled:opacity-40 ${currency === code ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{code}</button>)}</div>
    </section>
  );
}

const PERIODS: [keyof NonNullable<Detail["facts"]>["history"], string][] = [["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"], ["year", "Yearly"]];

function HistoryTable({ facts, currency }: { facts: NonNullable<Detail["facts"]>; currency: string }) {
  const available = PERIODS.filter(([key]) => facts.history[key].length > 0);
  const [period, setPeriod] = useState<keyof typeof facts.history>("day");
  const active = available.some(([key]) => key === period) ? period : (available[0]?.[0] ?? "day");
  const rows: HistoryRow[] = facts.history[active];
  return (
    <section id="history" className={`${panelClass} scroll-mt-24`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={eyebrowClass}>Price history</p>
        <div className="flex gap-1.5">{available.map(([key, label]) => <button key={key} type="button" onClick={() => setPeriod(key)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${active === key ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{label}</button>)}</div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead><tr className="border-b border-[#d4af5a]/15 text-[10px] uppercase tracking-[0.12em] text-[#a9b0a3]"><th className="py-2 pr-3 font-semibold">Period</th><th className="px-3 py-2 text-right font-semibold">Open</th><th className="px-3 py-2 text-right font-semibold">High</th><th className="px-3 py-2 text-right font-semibold">Low</th><th className="px-3 py-2 text-right font-semibold">Close</th><th className="px-3 py-2 text-right font-semibold">Change</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[#d4af5a]/8">
                <td className="py-2 pr-3 text-[#f1e8d6]">{row.label}</td>
                <td className="px-3 py-2 text-right text-[#c9c6ba]">{price(row.open)}</td>
                <td className="px-3 py-2 text-right text-[#c9c6ba]">{price(row.high)}</td>
                <td className="px-3 py-2 text-right text-[#c9c6ba]">{price(row.low)}</td>
                <td className="px-3 py-2 text-right text-[#f1e8d6]">{price(row.close)}</td>
                <td className={`px-3 py-2 text-right ${tone(row.change)}`}>{pct(row.change)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#a9b0a3]">Prices in {currency}, built from daily closing prices. Open is the previous period&apos;s close, and high and low are the highest and lowest close in the period, so brief swings inside a day are not shown.</p>
    </section>
  );
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-3"><p className={eyebrowClass}>{label}</p><p className="mt-1 text-sm text-[#f1e8d6]">{children}</p></div>;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#e0c078] underline-offset-4 hover:underline">
      {children} <span aria-hidden>↗</span>
    </a>
  );
}

export function AssetDetailPanel({ assetKey, alertId }: { assetKey: string; alertId: string | null }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(assetKey ? null : "No asset chosen.");
  const [signedOut, setSignedOut] = useState(false);
  const setView = (view: ViewRecord) => setDetail((current) => (current ? { ...current, view } : current));

  useEffect(() => {
    if (!assetKey) return;
    void api<{ detail: Detail }>(`/api/market-desk/detail?key=${encodeURIComponent(assetKey)}${alertId ? `&alert=${encodeURIComponent(alertId)}` : ""}`)
      .then((result) => setDetail(result.detail))
      .catch((cause: Error) => {
        if (/sign in/i.test(cause.message)) setSignedOut(true);
        else setError(cause.message);
      });
  }, [assetKey, alertId]);

  if (signedOut) {
    return (
      <div className={panelClass}>
        <p className="text-sm text-[#a9b0a3]">Sign in first, then reopen this link. <Link href="/admin/ai-updates" className="text-[#e0c078] underline-offset-4 hover:underline">Go to sign in</Link></p>
      </div>
    );
  }
  if (error) return <div className={panelClass}><p className="text-sm text-[#e8b4a0]">{error}</p></div>;
  if (!detail) return <div className={panelClass}><p className="text-sm text-[#a9b0a3]">Loading the evidence...</p></div>;

  const { asset, alert, holding } = detail;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/market-desk" className="text-[11px] font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline">← Back to Market Desk</Link>
        <Link href={`/admin/market-desk/compare?keys=${encodeURIComponent(detail.asset.key)}`} className={ghostButtonClass}>Compare with others</Link>
      </div>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar row={detail.ranking ?? { image: null, symbol: asset.symbol, name: asset.name }} size={52} />
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-[#f1e8d6]">{asset.name} <span className="ml-1 rounded-full border border-[#d4af5a]/40 px-2.5 py-0.5 align-middle font-sans text-xs text-[#e0c078]">{asset.symbol}</span></h1>
          <p className="mt-1 text-xs text-[#a9b0a3]">{asset.asset_type}{detail.ranking ? ` · ranked #${detail.ranking.rank} of our scan` : ""} · prices updated {when(asset.updated_at)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-serif text-4xl text-[#f1e8d6]">{gbpPrice(asset.price_gbp)}</p>
          <p className={`text-sm ${tone(asset.change_1d)}`}>{pct(asset.change_1d)} today <span className="text-[11px] text-[#a9b0a3]">· {price(asset.price, asset.currency)}</span></p>
        </div>
      </header>

      {alert ? (
        <section className="rounded-2xl border border-[#e0c078]/50 bg-[#e0c078]/8 p-5">
          <p className={eyebrowClass}>Why you were warned</p>
          <p className="mt-2 text-base font-semibold text-[#f1e8d6]">{alert.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#d5d0c1]">{alert.message}</p>
          {detail.rule ? <p className="mt-3 text-xs leading-relaxed text-[#a9b0a3]"><span className="font-semibold text-[#e0c078]">The rule:</span> {detail.rule} You can change the limits under Alerts and settings.</p> : null}
        </section>
      ) : null}

      <section id="price" className={`${panelClass} scroll-mt-24`}>
        <p className={eyebrowClass}>Price chart</p>
        <div className="mt-3"><Chart detail={detail} /></div>
        <p className="mt-3 text-[11px] text-[#a9b0a3]">Daily closing prices in {asset.currency}. Dashed lines mark the levels any warning is measured against.</p>
      </section>

      <RiskBanner />

      <SectionNav hasResearch={!!detail.ranking} hasAbout={!!detail.facts?.about} hasCompany={!!detail.facts?.fundamentals} />

      <section id="stats" className="grid scroll-mt-24 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCell label="Market cap">{gbpCompact(detail.ranking?.market_cap_gbp)}</StatCell>
        <StatCell label="Traded today">{gbpCompact(detail.ranking?.volume_gbp)}</StatCell>
        <StatCell label="Market rank">{detail.facts?.rank ? `#${detail.facts.rank}` : detail.ranking ? `#${detail.ranking.rank} in our scan` : "n/a"}</StatCell>
        <StatCell label="Last 30 sessions">{detail.facts ? <><span className="text-[#8fbf9f]">{detail.facts.up_days_30} up</span> · <span className="text-[#e8b4a0]">{detail.facts.down_days_30} down</span></> : "n/a"}</StatCell>
        <StatCell label="7 days"><span className={tone(asset.change_7d)}>{pct(asset.change_7d)}</span></StatCell>
        <StatCell label="30 days"><span className={tone(asset.change_30d)}>{pct(asset.change_30d)}</span></StatCell>
        <StatCell label="90 days"><span className={tone(asset.change_90d)}>{pct(asset.change_90d)}</span></StatCell>
        <StatCell label="52-week range">{detail.ranking?.year_low && detail.ranking?.year_high ? `${price(detail.ranking.year_low)} to ${price(detail.ranking.year_high)}` : "n/a"}</StatCell>
        {detail.facts?.ath ? <StatCell label={detail.facts.ath.scope === "all-time" ? "All-time high" : "10-year high"}>{price(detail.facts.ath.price, asset.currency)}<span className="block text-[11px] text-[#a9b0a3]">{dateText(detail.facts.ath.date)}</span></StatCell> : null}
        {detail.facts?.ath ? <StatCell label="From that high"><span className={tone(detail.facts.ath.below_by)}>{pct(detail.facts.ath.below_by)}</span><span className="block text-[11px] text-[#a9b0a3]">{detail.facts.ath.days_since.toLocaleString("en-GB")} days ago</span></StatCell> : null}
        <StatCell label="Against 200-day average"><span className={tone(detail.ranking?.vs_sma200)}>{pct(detail.ranking?.vs_sma200)}</span></StatCell>
        <StatCell label="Worst fall in a year"><span className="text-[#e8b4a0]">{pct(asset.drawdown_1y, false)}</span></StatCell>
        {detail.facts?.max_supply || (asset.asset_type === "crypto" && detail.facts?.circulating_supply) ? <StatCell label="Coins in circulation">{units(detail.facts?.circulating_supply)}{detail.facts?.max_supply ? <span className="block text-[11px] text-[#a9b0a3]">of {units(detail.facts.max_supply)} maximum</span> : null}</StatCell> : null}
        {detail.facts?.pe ? <StatCell label="Price to earnings">{detail.facts.pe.toFixed(1)}</StatCell> : null}
        {detail.facts?.dividend_yield ? <StatCell label="Dividend yield">{(detail.facts.dividend_yield * 100).toFixed(2)}%</StatCell> : null}
        {detail.facts?.beta !== null && detail.facts?.beta !== undefined ? <StatCell label="Beta (vs the market)">{detail.facts.beta.toFixed(2)}</StatCell> : null}
        {detail.facts?.sector ? <StatCell label="Sector">{detail.facts.sector}{detail.facts.industry ? <span className="block text-[11px] text-[#a9b0a3]">{detail.facts.industry}</span> : null}</StatCell> : null}
      </section>

      <PulseCard assetKey={asset.key} />

      <Converter priceGbp={asset.price_gbp} symbol={asset.symbol} />

      <OutlookCard detail={detail} onView={setView} />

      {detail.facts?.fundamentals ? <CompanyCheck fundamentals={detail.facts.fundamentals} change30={asset.change_30d} /> : null}

      {detail.ranking ? <div id="research" className="scroll-mt-24"><ResearchView ranking={detail.ranking} assetKey={asset.key} view={detail.view} onView={setView} /></div> : null}

      {detail.facts ? <HistoryTable facts={detail.facts} currency={asset.currency} /> : null}

      {detail.facts?.about ? (
        <section id="about" className={`${panelClass} scroll-mt-24`}>
          <p className={eyebrowClass}>About {asset.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-[#d5d0c1]">{detail.facts.about}</p>
          {detail.facts.categories.length > 0 ? <ul className="mt-3 flex flex-wrap gap-2">{detail.facts.categories.map((name) => <li key={name} className="rounded-full border border-[#d4af5a]/30 px-3 py-1 text-[11px] text-[#c9c6ba]">{name}</li>)}</ul> : null}
          <p className="mt-3 text-[11px] text-[#a9b0a3]">{detail.facts.about_source ? <>Description from <ExternalLink href={detail.facts.about_source.url}>{detail.facts.about_source.name}</ExternalLink>. </> : null}{detail.facts.website ? <ExternalLink href={detail.facts.website}>Official website</ExternalLink> : null}</p>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className={panelClass}>
          <p className={eyebrowClass}>What happened</p>
          <ul className="mt-3 space-y-2 text-sm text-[#d5d0c1]">
            {detail.timeline.map((item) => <li key={`${item.date}${item.text}`}><span className="text-[11px] text-[#a9b0a3]">{item.date}</span><br />{item.text}</li>)}
          </ul>
          <p className="mt-3 text-xs text-[#a9b0a3]">1 day <span className={tone(asset.change_1d)}>{pct(asset.change_1d)}</span> · 7 days <span className={tone(asset.change_7d)}>{pct(asset.change_7d)}</span> · 30 days <span className={tone(asset.change_30d)}>{pct(asset.change_30d)}</span> · 90 days <span className={tone(asset.change_90d)}>{pct(asset.change_90d)}</span></p>
        </div>
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3"><p className={eyebrowClass}>How risky it is</p><RiskBadge label={asset.risk_label} score={asset.risk_score} /></div>
          <div className="mt-3"><RiskMeter score={asset.risk_score} /></div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">{asset.risk_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {holding ? <p className="mt-3 text-xs text-[#a9b0a3]">You hold {holding.quantity}, bought at {price(holding.buy_price, holding.buy_currency)}{holding.buy_date ? ` on ${when(holding.buy_date)}` : ""}.</p> : null}
        </div>
      </section>

      <section id="news" className={`${panelClass} scroll-mt-24`}>
        <p className={eyebrowClass}>Latest news about it</p>
        {detail.news.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">No recent headlines found. Try the links below.</p> : (
          <ul className="mt-3 space-y-2">
            {detail.news.map((item) => (
              <li key={item.link} className="text-sm"><ExternalLink href={item.link}>{item.title}</ExternalLink><span className="block text-[11px] text-[#a9b0a3]">{item.publisher}{item.published ? ` · ${when(item.published)}` : ""}</span></li>
            ))}
          </ul>
        )}
      </section>

      {detail.signals.length > 0 ? (
        <section className={panelClass}>
          <p className={eyebrowClass}>Smart-money signals on it</p>
          <ul className="mt-3 space-y-2.5">
            {detail.signals.map((signal) => (
              <li key={signal.id} className="text-sm text-[#d5d0c1]">
                <span className="text-[11px] text-[#a9b0a3]">{signal.signal_type.replace("_", " ")} · {signal.direction} · {when(signal.observed_at)}</span><br />{signal.summary}
                {signal.source_url ? <> <ExternalLink href={signal.source_url}>Source</ExternalLink></> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.announcements.length > 0 ? (
        <section className={panelClass}>
          <p className={eyebrowClass}>Big announcements this week</p>
          <ul className="mt-3 space-y-2">
            {detail.announcements.map((item) => <li key={item.source_url} className="text-sm"><ExternalLink href={item.source_url.split("#")[0]}>{item.title}</ExternalLink><span className="block text-[11px] text-[#a9b0a3]">{when(item.event_date)}</span></li>)}
          </ul>
        </section>
      ) : null}

      <section id="sources" className={`${panelClass} scroll-mt-24`}>
        <p className={eyebrowClass}>Check the numbers yourself</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {detail.links.map((link) => <li key={link.url}><ExternalLink href={link.url}>{link.label}</ExternalLink></li>)}
        </ul>
      </section>
      <Disclaimer />
    </div>
  );
}
