"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Overview } from "@/lib/market-desk/overview";
import type { BriefIdea, BriefSections } from "@/lib/market-desk/brief";
import type { AssetRow, SearchHit } from "@/lib/market-desk/types";
import type { WhatIf } from "@/lib/market-desk/whatif";
import {
  RiskBadge,
  RiskMeter,
  Sparkline,
  api,
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

type Shared = {
  setNotice: (value: string | null) => void;
  setError: (value: string | null) => void;
  reload: () => Promise<void>;
};

type Brief = { id: string; week_start: string; title: string; created_at: string; sections: BriefSections };

const RISK_ORDER = ["Very low", "Low", "Moderate", "High", "Very high"];

function Block({ title, children }: { title: string; children: string }) {
  if (!children) return null;
  return (
    <div>
      <p className={eyebrowClass}>{title}</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-[#d5d0c1]">
        {children.split(/\n\n+/).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
      </div>
    </div>
  );
}

function IdeaCard({ idea, onWatch }: { idea: BriefIdea; onWatch: (key: string) => void }) {
  return (
    <li className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#f1e8d6]">{idea.name} <span className="font-normal text-[#a9b0a3]">{idea.symbol} · {idea.type}</span></p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#a9b0a3]">Looks like a {idea.horizon} idea · confidence {idea.confidence}</span>
          <RiskBadge label={idea.risk_label} />
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#d5d0c1]">{idea.thesis}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><p className={eyebrowClass}>Evidence for</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">{idea.evidence.map((line) => <li key={line}>{line}</li>)}</ul></div>
        <div><p className={eyebrowClass}>Evidence against and risks</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">{idea.risks.map((line) => <li key={line}>{line}</li>)}</ul></div>
      </div>
      {idea.would_change_my_mind ? <p className="mt-3 text-xs text-[#a9b0a3]"><span className="font-semibold text-[#e0c078]">This view changes if:</span> {idea.would_change_my_mind}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(idea.asset_key)}`} className="text-xs font-semibold text-[#e0c078] underline-offset-4 hover:underline">See the data, chart and news →</Link>
        <button type="button" className={microButtonClass} onClick={() => onWatch(idea.asset_key)}>Add to watchlist</button>
      </div>
    </li>
  );
}

export function BriefTab({ setNotice, setError, reload }: Shared) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sources, setSources] = useState<{ title: string; source_url: string; event_date: string | null; region: string; impact: string }[]>([]);

  useEffect(() => {
    void api<{ events: typeof sources }>("/api/market-desk/events").then((result) => setSources(result.events.filter((event) => event.impact !== "low" || event.title.includes(":")).slice(0, 40))).catch(() => undefined);
    void api<{ brief: Brief | null }>("/api/market-desk/brief")
      .then((result) => setBrief(result.brief))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load the brief."))
      .finally(() => setLoading(false));
  }, [setError]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      await api("/api/market-desk/brief", { method: "POST" });
      setBrief((await api<{ brief: Brief | null }>("/api/market-desk/brief")).brief);
      setNotice("This week's brief is ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The brief failed. Try again in a minute.");
    } finally {
      setGenerating(false);
    }
  }

  async function watch(key: string) {
    try {
      await api("/api/market-desk/watchlist", { method: "POST", json: { key } });
      setNotice("Added to your watchlist.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add it.");
    }
  }

  const s = brief?.sections;
  const ideas = [...(s?.ideas ?? [])].sort((a, b) => RISK_ORDER.indexOf(a.risk_label) - RISK_ORDER.indexOf(b.risk_label));

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={eyebrowClass}>Weekly brief</p>
            <p className="mt-1 text-sm text-[#a9b0a3]">{brief ? `${brief.title} · week of ${when(brief.week_start)}` : "Written every Monday morning from announcements, price scans and smart-money signals."}</p>
          </div>
          <button type="button" className={ghostButtonClass} onClick={() => void generate()} disabled={generating}>{generating ? "Writing, about 2 minutes..." : brief ? "Write a fresh one now" : "Write this week's brief"}</button>
        </div>
        {loading ? <p className="mt-3 text-sm text-[#a9b0a3]">Loading...</p> : null}
        {generating ? <p className="mt-3 text-xs text-[#a9b0a3]">Reading central bank announcements, scanning about 80 stocks, ETFs and commodities, 10 currencies and the top crypto, then writing. Keep this tab open.</p> : null}
      </section>

      {s ? (
        <>
          <section className={`${panelClass} space-y-5`}>
            <div><p className={eyebrowClass}>What matters this week</p><ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#d5d0c1]">{s.summary.map((line) => <li key={line}>{line}</li>)}</ul></div>
            <Block title="Central banks and announcements">{s.central_banks}</Block>
            {s.week_ahead.length > 0 ? (
              <div><p className={eyebrowClass}>The week ahead</p><ul className="mt-2 space-y-2 text-sm text-[#d5d0c1]">{s.week_ahead.map((item) => <li key={`${item.when}${item.what}`}><span className="text-[#e0c078]">{item.when}</span>: {item.what}<span className="block text-xs text-[#a9b0a3]">{item.why_it_matters}</span></li>)}</ul></div>
            ) : null}
          </section>

          <section className={`${panelClass} space-y-5`}>
            <div><p className={eyebrowClass}>Ideas worth investigating, safest to riskiest</p><p className="mt-1 text-xs text-[#a9b0a3]">Not recommendations. Each shows the evidence for, the evidence against, and what would change the view.</p></div>
            <ul className="space-y-3">{ideas.map((idea) => <IdeaCard key={idea.asset_key} idea={idea} onWatch={(key) => void watch(key)} />)}</ul>
            {s.avoid_or_caution.length > 0 ? <div><p className={eyebrowClass}>Handle with care</p><ul className="mt-2 space-y-1.5 text-sm text-[#d5d0c1]">{s.avoid_or_caution.map((item) => <li key={item.symbol}><strong className="text-[#e8b4a0]">{item.symbol}</strong>: {item.why}</li>)}</ul></div> : null}
          </section>

          <section className={`${panelClass} space-y-5`}>
            <Block title="Currencies">{s.currencies}</Block>
            <Block title="Gold, silver, copper and other commodities">{s.commodities}</Block>
            <Block title="Stocks and ETFs">{s.stocks}</Block>
            <Block title="Crypto">{s.crypto}</Block>
            <Block title="Smart money: insiders and large transfers">{s.smart_money}</Block>
            <Block title="New launches">{s.launches}</Block>
            <p className="text-xs text-[#a9b0a3]">{s.limits}</p>
          </section>

          <section className={panelClass}>
            <p className={eyebrowClass}>Sources behind this brief</p>
            <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">Every announcement the brief drew on, as published. Click any to read the original. Price figures come from the league tables below, and each name there opens its own evidence page.</p>
            {sources.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">Loading the sources...</p> : (
              <ul className="mt-3 space-y-1.5">
                {sources.map((item) => (
                  <li key={item.source_url} className="text-sm"><a href={item.source_url.split("#")[0]} target="_blank" rel="noreferrer" className="text-[#f1e8d6] underline-offset-4 hover:text-[#e0c078] hover:underline">{item.title} <span aria-hidden className="text-[#a9b0a3]">↗</span></a><span className="ml-2 text-[11px] text-[#a9b0a3]">{when(item.event_date)} · {item.region}</span></li>
                ))}
              </ul>
            )}
          </section>

          <section className={panelClass}>
            <p className={eyebrowClass}>The league tables behind it</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[#e0c078]">Currencies, strongest first (against the group)</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.currencies.map((item, index) => <li key={item.code}>{index + 1}. {item.code} <span className={tone(item.change_90d)}>{pct(item.change_90d)} over 3 months</span></li>)}</ol>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e0c078]">Commodities</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.commodities.map((item) => <li key={item.key}><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(item.key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{item.name}</Link> <span className={tone(item.change_90d)}>{pct(item.change_90d)}</span> <span className="text-[11px] text-[#a9b0a3]">3 months · {item.risk_label} risk</span></li>)}</ol>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e0c078]">Strongest stocks</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.stocks_top.map((item) => <li key={item.key}><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(item.key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{item.name}</Link> <span className={tone(item.change_90d)}>{pct(item.change_90d)}</span> <span className="text-[11px] text-[#a9b0a3]">{item.risk_label} risk</span></li>)}</ol>
                <p className="mt-3 text-xs font-semibold text-[#e0c078]">Weakest stocks</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.stocks_bottom.map((item) => <li key={item.key}><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(item.key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{item.name}</Link> <span className={tone(item.change_90d)}>{pct(item.change_90d)}</span></li>)}</ol>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#e0c078]">Strongest crypto (200 day change)</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.crypto_top.map((item) => <li key={item.key}><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(item.key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{item.name}</Link> <span className={tone(item.change_200d)}>{pct(item.change_200d)}</span> <span className="text-[11px] text-[#a9b0a3]">30 days {pct(item.change_30d)}</span></li>)}</ol>
                <p className="mt-3 text-xs font-semibold text-[#e0c078]">Weakest crypto</p>
                <ol className="mt-2 space-y-1 text-sm text-[#d5d0c1]">{s.leaders.crypto_bottom.map((item) => <li key={item.key}><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(item.key)}`} className="underline-offset-4 hover:text-[#e0c078] hover:underline">{item.name}</Link> <span className={tone(item.change_200d)}>{pct(item.change_200d)}</span></li>)}</ol>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

type Confluence = { symbol: string; direction: string; types: string[]; summaries: string[] };
type Record_ = { signal_type: string; direction: string; n: number; hit_rate: number; avg_move: number; avg_days: number };
type Signal = { id: string; symbol: string; signal_type: string; direction: string; strength: number; summary: string; source_url: string | null; observed_at: string };
type Launch = { id: string; kind: string; name: string; symbol: string; summary: string; risk_flags: string[]; risk_level: string; source_url: string; launched_at: string | null };
type EventItem = { id: string; kind: string; title: string; summary: string; region: string; impact: string; source_url: string; event_date: string | null };

const DIRECTION: Record<string, string> = { bullish: "text-[#8fbf9f]", bearish: "text-[#e8b4a0]", neutral: "text-[#a9b0a3]" };

export function SignalsTab() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [confluence, setConfluence] = useState<Confluence[]>([]);
  const [record, setRecord] = useState<Record_[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [kind, setKind] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void api<{ signals: Signal[]; launches: Launch[]; confluence: Confluence[]; record: Record_[] }>("/api/market-desk/signals").then((result) => { setSignals(result.signals); setLaunches(result.launches); setConfluence(result.confluence); setRecord(result.record); }).catch(() => undefined);
    void api<{ events: EventItem[] }>("/api/market-desk/events").then((result) => setEvents(result.events)).catch(() => undefined);
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      setEvents((await api<{ events: EventItem[] }>("/api/market-desk/events", { method: "POST" })).events);
    } finally {
      setRefreshing(false);
    }
  }

  const shown = events.filter((event) => kind === "all" || event.kind === kind);
  const kinds = ["all", "central_bank", "economic", "crypto_regulation", "etf"];

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrowClass}>Announcements and calendar</p>
          <button type="button" className={microButtonClass} onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh now"}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {kinds.map((item) => <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${kind === item ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3]"}`}>{item === "all" ? "All" : item.replace("_", " ")}</button>)}
        </div>
        {shown.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">Nothing loaded yet. Press Refresh now.</p> : (
          <ul className="mt-4 space-y-2">
            {shown.map((event) => (
              <li key={event.id} className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-2.5">
                <p className="text-[11px] text-[#a9b0a3]">{when(event.event_date)} · {event.region} · {event.kind.replace("_", " ")} · <span className={event.impact === "high" ? "text-[#e8a070]" : ""}>{event.impact} impact</span></p>
                <a href={event.source_url.split("#")[0]} target="_blank" rel="noreferrer" className="text-sm text-[#f1e8d6] underline-offset-4 hover:text-[#e0c078] hover:underline">{event.title} <span aria-hidden className="text-[#a9b0a3]">↗</span></a>
                {event.summary ? <p className="mt-0.5 text-xs text-[#a9b0a3]">{event.summary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {confluence.length > 0 ? (
        <section className={panelClass}>
          <p className={eyebrowClass}>Where different signals agree</p>
          <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">A single signal is easy to misread. When two or more different kinds point the same way on the same asset, the case is stronger, though still not proof.</p>
          <ul className="mt-3 space-y-2">
            {confluence.map((item) => (
              <li key={`${item.symbol}${item.direction}`} className="rounded-xl border border-[#d4af5a]/25 bg-[#0a100c]/55 px-4 py-2.5 text-sm text-[#f1e8d6]">
                <strong>{item.symbol}</strong> <span className={`text-xs ${DIRECTION[item.direction]}`}>{item.direction}</span>
                <span className="text-[11px] text-[#a9b0a3]"> · {item.types.map((type) => type.replace("_", " ")).join(" + ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={panelClass}>
        <p className={eyebrowClass}>Smart money signals</p>
        <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">Insider buying and selling, what the big hedge funds bought and sold last quarter (about 45 days late), unusual options trading, Bitcoin and Ethereum flowing onto or off exchanges, and unusual crypto volume. Big money is often wrong, and many of these have innocent explanations such as hedging, so each is a hint to investigate, not a reason to act.</p>
        {signals.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">No signals yet. They are collected when the weekly brief is written.</p> : (
          <ul className="mt-4 space-y-2">
            {signals.map((signal) => (
              <li key={signal.id} className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-2.5">
                <p className="text-sm text-[#f1e8d6]"><strong>{signal.symbol}</strong> <span className={`text-xs ${DIRECTION[signal.direction]}`}>{signal.direction}</span> <span className="text-[11px] text-[#a9b0a3]">· {signal.signal_type.replace("_", " ")} · strength {signal.strength}/5 · {when(signal.observed_at)}</span></p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#c9c6ba]">{signal.summary}</p>
                {signal.source_url ? <a href={signal.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-[#e0c078] hover:underline">Source ↗</a> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={panelClass}>
        <p className={eyebrowClass}>Did following the signals work?</p>
        <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">Every signal records the price when it appeared. A week or more later, the price is checked and scored: did it move the way the signal pointed? This builds your own evidence over time. Until each kind has dozens of results, treat these numbers as noise.</p>
        {record.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">Too early. Results start appearing a week after the first signals, and become meaningful after a few months.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead><tr className="text-[10px] tracking-[0.16em] text-[#a9b0a3] uppercase"><th className="py-1 pr-3">Signal</th><th className="py-1 pr-3">Pointed</th><th className="py-1 pr-3">Seen</th><th className="py-1 pr-3">Price moved that way</th><th className="py-1">Average move</th></tr></thead>
              <tbody>
                {record.map((item) => (
                  <tr key={`${item.signal_type}${item.direction}`} className="border-t border-[#d4af5a]/10">
                    <td className="py-2 pr-3 text-[#f1e8d6]">{item.signal_type.replace("_", " ")}</td>
                    <td className={`py-2 pr-3 ${DIRECTION[item.direction]}`}>{item.direction}</td>
                    <td className="py-2 pr-3 text-[#c9c6ba]">{item.n}{item.n < 20 ? " (too few)" : ""}</td>
                    <td className="py-2 pr-3 text-[#c9c6ba]">{(item.hit_rate * 100).toFixed(0)}%</td>
                    <td className={`py-2 ${tone(item.avg_move)}`}>{pct(item.avg_move)} over about {Math.round(item.avg_days)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={panelClass}>
        <p className={eyebrowClass}>What is new: tokens, IPOs and currencies</p>
        <p className="mt-1 text-xs leading-relaxed text-[#a9b0a3]">Everything new is treated as risky until it has a track record. New tokens in particular are where most scams and total losses happen, so each one is checked against common warning signs.</p>
        {launches.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">Nothing yet. These are collected when the weekly brief is written.</p> : (
          <ul className="mt-4 space-y-2">
            {launches.map((launch) => (
              <li key={launch.id} className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#f1e8d6]">{launch.name} {launch.symbol ? <span className="text-[#a9b0a3]">{launch.symbol}</span> : null} <span className="text-[11px] text-[#a9b0a3]">· {launch.kind}</span></p>
                  <RiskBadge label={launch.risk_level} />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[#c9c6ba]">{launch.summary}</p>
                {launch.risk_flags.length > 0 ? <ul className="mt-1 list-disc pl-4 text-[11px] text-[#e8b4a0]">{launch.risk_flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
                <a href={launch.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-[#e0c078] hover:underline">Source</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function MarketsTab({ overview, reload, setNotice, setError }: Shared & { overview: Overview }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [months, setMonths] = useState("12");
  const [result, setResult] = useState<WhatIf | null>(null);
  const [calculating, setCalculating] = useState(false);

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

  async function open(key: string) {
    setLoadingAsset(true);
    setResult(null);
    setError(null);
    try {
      setAsset((await api<{ asset: AssetRow }>(`/api/market-desk/asset?key=${encodeURIComponent(key)}`)).asset);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load that asset.");
    } finally {
      setLoadingAsset(false);
    }
  }

  async function watch(key: string) {
    try {
      await api("/api/market-desk/watchlist", { method: "POST", json: { key } });
      setNotice("Added to your watchlist.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add it.");
    }
  }

  async function unwatch(key: string) {
    await api("/api/market-desk/watchlist", { method: "DELETE", json: { key } }).catch(() => undefined);
    await reload();
  }

  async function calculate() {
    if (!asset) return;
    setCalculating(true);
    setError(null);
    try {
      setResult((await api<{ result: WhatIf }>(`/api/market-desk/whatif?key=${encodeURIComponent(asset.key)}&amount=${Number(amount)}&months=${Number(months)}`)).result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not calculate.");
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <p className={eyebrowClass}>Search any stock, ETF, coin, currency or metal</p>
        <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="mt-3 flex flex-wrap gap-2">
          <input className={`${fieldClass} max-w-sm`} placeholder="For example: Tesla, bitcoin, gold, GBP USD" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" className={ghostButtonClass} disabled={searching}>{searching ? "Searching..." : "Search"}</button>
        </form>
        {hits.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {hits.map((hit) => <li key={hit.key}><button type="button" onClick={() => void open(hit.key)} className="w-full rounded-xl border border-[#d4af5a]/25 px-3 py-2 text-left text-sm text-[#f1e8d6] hover:border-[#d4af5a]/60">{hit.name}<span className="block text-[11px] text-[#a9b0a3]">{hit.symbol} · {hit.type}{hit.exchange ? ` · ${hit.exchange}` : ""}</span></button></li>)}
          </ul>
        ) : null}
        {loadingAsset ? <p className="mt-3 text-sm text-[#a9b0a3]">Loading prices...</p> : null}
      </section>

      {asset ? (
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-xl text-[#f1e8d6]">{asset.name}</p>
              <p className="text-[11px] text-[#a9b0a3]">{asset.symbol} · {asset.asset_type} · {price(asset.price, asset.currency)}{asset.price_gbp ? ` (${gbp(asset.price_gbp)})` : ""}</p>
            </div>
            <Sparkline values={asset.history} width={140} height={40} />
            <RiskBadge label={asset.risk_label} score={asset.risk_score} />
          </div>
          <div className="mt-3"><RiskMeter score={asset.risk_score} /><div className="mt-1 flex justify-between text-[10px] text-[#a9b0a3]"><span>Safest</span><span>Most volatile</span></div></div>
          <p className="mt-3 text-xs text-[#a9b0a3]">1 day <span className={tone(asset.change_1d)}>{pct(asset.change_1d)}</span> · 7 days <span className={tone(asset.change_7d)}>{pct(asset.change_7d)}</span> · 30 days <span className={tone(asset.change_30d)}>{pct(asset.change_30d)}</span> · 90 days <span className={tone(asset.change_90d)}>{pct(asset.change_90d)}</span></p>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">{asset.risk_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className={microButtonClass} onClick={() => void watch(asset.key)}>Add to watchlist</button><Link href={`/admin/market-desk/asset?key=${encodeURIComponent(asset.key)}`} className="text-xs font-semibold text-[#e0c078] underline-offset-4 hover:underline">Full evidence page: chart, news and sources →</Link></div>

          <div className="mt-6 border-t border-[#d4af5a]/15 pt-4">
            <p className={eyebrowClass}>What if: how this played out in the past</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className="space-y-1.5"><span className={labelClass}>Amount</span><input className={`${fieldClass} w-32`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              <label className="space-y-1.5"><span className={labelClass}>Held for (months)</span><input className={`${fieldClass} w-28`} inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} /></label>
              <button type="button" className={primaryButtonClass} disabled={calculating} onClick={() => void calculate()}>{calculating ? "Looking back..." : "Look back"}</button>
            </div>
            {result ? (
              <div className="mt-4 text-sm text-[#d5d0c1]">
                <p>Over {result.windows} possible start dates in the last {result.years} years, holding {price(result.amount, result.currency)} for {result.months} month{result.months === 1 ? "" : "s"} ended like this:</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[["Worst", result.worst], ["Poor (1 in 10)", result.p10], ["Typical", result.median], ["Good (1 in 10)", result.p90], ["Best", result.best]].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-[#d4af5a]/20 bg-[#0a100c]/55 px-3 py-2"><p className={eyebrowClass}>{label}</p><p className={`mt-1 font-serif text-lg ${Number(value) >= result.amount ? "text-[#8fbf9f]" : "text-[#e8b4a0]"}`}>{price(Number(value), result.currency)}</p></div>
                  ))}
                </div>
                <p className="mt-3 text-xs">It lost money in {(result.lossShare * 100).toFixed(0)}% of those periods. {result.note}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={panelClass}>
        <p className={eyebrowClass}>Your watchlist</p>
        {overview.watchlist.length === 0 ? <p className="mt-3 text-sm text-[#a9b0a3]">Nothing on it yet. Search above, or add ideas from the weekly brief.</p> : (
          <ul className="mt-3 space-y-2">
            {overview.watchlist.map((item) => (
              <li key={item.asset_key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 px-4 py-2.5">
                <button type="button" className="min-w-0 text-left" onClick={() => void open(item.asset_key)}><span className="text-sm text-[#f1e8d6] underline-offset-4 hover:underline">{item.name || item.symbol}</span><span className="block text-[11px] text-[#a9b0a3]">{item.symbol} · {item.asset_type}</span></button>
                <Sparkline values={item.asset?.history ?? []} />
                <span className={`text-xs ${tone(item.asset?.change_30d)}`}>{pct(item.asset?.change_30d)} 30d</span>
                <RiskBadge label={item.asset?.risk_label} score={item.asset?.risk_score} />
                <button type="button" className={microButtonClass} onClick={() => void unwatch(item.asset_key)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
