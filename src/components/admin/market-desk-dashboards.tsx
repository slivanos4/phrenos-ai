"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dashboard, Widget, WidgetType } from "@/lib/market-desk/dashboards";
import type { Overview } from "@/lib/market-desk/overview";
import type { Pulse } from "@/lib/market-desk/pulse";
import type { RankingRow } from "@/lib/market-desk/rankings";
import { Avatar } from "@/components/admin/market-desk-rankings";
import { MarketStrip, makeMoney, useMarketStats } from "@/components/admin/market-desk-stats";
import { RiskBadge, api, eyebrowClass, fieldClass, ghostButtonClass, microButtonClass, panelClass, pct, primaryButtonClass, tone, when } from "@/components/admin/market-desk-ui";

type EventRow = { title: string; event_date: string; impact: string; region: string; source_url: string };
type BriefRow = { title: string; week_start: string; sections: { summary?: string[] } };

const CATALOGUE: { type: WidgetType; title: string; about: string }[] = [
  { type: "market", title: "The whole market", about: "Total crypto value, Fear and Greed, how many assets are rising, trending" },
  { type: "holdings", title: "Your holdings", about: "Value, profit or loss and risk of what you hold" },
  { type: "alerts", title: "Warnings", about: "Your latest open warnings" },
  { type: "pulse", title: "Daily Pulse", about: "Today's sourced summary for what you hold or watch" },
  { type: "gainers", title: "Biggest risers today", about: "Top five of everything we scan" },
  { type: "losers", title: "Biggest fallers today", about: "Bottom five of everything we scan" },
  { type: "top", title: "Top ranked", about: "The five highest evidence scores" },
  { type: "watchlist", title: "Watchlist", about: "Your watched assets and how they moved" },
  { type: "events", title: "Coming up", about: "Major announcements and economic events" },
  { type: "brief", title: "This week's brief", about: "The summary from the Monday brief" },
  { type: "trending", title: "Trending coins", about: "What people are looking at on CoinGecko" },
];
const titleOf = (type: WidgetType) => CATALOGUE.find((item) => item.type === type)?.title ?? type;

type Shared = {
  overview: Overview;
  rankings: RankingRow[];
  events: EventRow[];
  /** When the events were loaded, so "upcoming" does not depend on the clock during render. */
  eventsAt: number;
  brief: BriefRow | null;
  pulses: Record<string, Pulse>;
};

function Card({ title, children, link }: { title: string; children: ReactNode; link?: { href: string; label: string } }) {
  return (
    <div className={`${panelClass} h-full`}>
      <div className="flex items-center justify-between gap-2"><p className={eyebrowClass}>{title}</p>{link ? <Link href={link.href} className="text-[11px] text-[#e0c078] underline-offset-4 hover:underline">{link.label}</Link> : null}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const assetHref = (key: string) => `/admin/market-desk/asset?key=${encodeURIComponent(key)}`;

function RankList({ rows, field }: { rows: RankingRow[]; field: "change_1d" | "score" }) {
  const money = makeMoney("GBP", null);
  if (rows.length === 0) return <p className="text-sm text-[#a9b0a3]">Nothing to show yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key}>
          <Link href={assetHref(row.key)} className="flex items-center gap-2.5 text-sm text-[#f1e8d6] hover:text-[#e0c078]">
            <Avatar row={row} size={22} />
            <span className="min-w-0 flex-1 truncate">{row.name} <span className="text-[11px] text-[#a9b0a3]">{row.symbol}</span></span>
            <span className="text-xs text-[#c9c6ba]">{money.price(row.price_gbp)}</span>
            {field === "score" ? <span className="w-8 text-right font-serif text-[#e0c078]">{row.score}</span> : <span className={`w-16 text-right text-xs ${tone(row.change_1d)}`}>{pct(row.change_1d)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function WidgetBody({ type, data }: { type: WidgetType; data: Shared }) {
  const stats = useMarketStats();
  const { overview, rankings } = data;
  const up = useMemo(() => {
    const known = rankings.filter((row) => row.change_1d !== null);
    return known.length ? { up: known.filter((row) => (row.change_1d ?? 0) > 0).length, down: known.filter((row) => (row.change_1d ?? 0) < 0).length, total: known.length } : null;
  }, [rankings]);

  switch (type) {
    case "market":
      return <MarketStrip stats={stats} currency="GBP" breadth={up} timeframe="24h" />;
    case "holdings": {
      const t = overview.totals;
      return (
        <Card title="Your holdings" link={{ href: "/admin/market-desk", label: "Open holdings" }}>
          {overview.holdings.length === 0 ? <p className="text-sm text-[#a9b0a3]">Nothing recorded yet. Add what you hold in the Holdings tab.</p> : (
            <>
              <p className="font-serif text-3xl text-[#f1e8d6]">{makeMoney("GBP", null).price(t.value_gbp)}</p>
              <p className={`text-sm ${tone(t.pl_gbp)}`}>{makeMoney("GBP", null).price(Math.abs(t.pl_gbp))} {t.pl_gbp >= 0 ? "ahead" : "behind"} {t.pl_pct !== null ? `(${pct(t.pl_pct)})` : ""}</p>
              <div className="mt-3"><RiskBadge label={t.risk_label} score={t.risk_score} /></div>
              <ul className="mt-3 space-y-1 text-xs text-[#c9c6ba]">{overview.holdings.slice(0, 5).map((holding) => <li key={holding.id} className="flex justify-between gap-2"><Link href={assetHref(holding.asset_key)} className="truncate hover:text-[#e0c078]">{holding.name || holding.symbol}</Link><span className={tone(holding.pl_pct)}>{pct(holding.pl_pct)}</span></li>)}</ul>
            </>
          )}
        </Card>
      );
    }
    case "alerts":
      return (
        <Card title="Warnings">
          {overview.alerts.length === 0 ? <p className="text-sm text-[#a9b0a3]">No open warnings.</p> : (
            <ul className="space-y-2">{overview.alerts.slice(0, 4).map((alert) => (
              <li key={alert.id} className="text-sm text-[#f1e8d6]">{alert.asset_key ? <Link href={`${assetHref(alert.asset_key)}&alert=${alert.id}`} className="hover:text-[#e0c078]">{alert.title}</Link> : alert.title}<span className="block text-[11px] text-[#a9b0a3]">{alert.severity} · {when(alert.created_at)}</span></li>
            ))}</ul>
          )}
        </Card>
      );
    case "pulse": {
      const items = Object.values(data.pulses).sort((a, b) => b.day.localeCompare(a.day));
      const names = new Map([...overview.holdings.map((h) => [h.asset_key, h.name || h.symbol] as const), ...overview.watchlist.map((w) => [w.asset_key, w.name || w.symbol] as const), ...rankings.map((r) => [r.key, r.name] as const)]);
      return (
        <Card title="Daily Pulse">
          {items.length === 0 ? <p className="text-sm text-[#a9b0a3]">No Pulse written yet. It is written each morning for what you hold, watch or see at the top of the rankings.</p> : (
            <ul className="grid gap-3 sm:grid-cols-2">{items.slice(0, 6).map((pulse) => (
              <li key={pulse.asset_key} className="rounded-xl border border-[#d4af5a]/15 bg-[#0a100c]/50 p-3">
                <Link href={assetHref(pulse.asset_key)} className="text-sm font-semibold text-[#f1e8d6] hover:text-[#e0c078]">{names.get(pulse.asset_key) ?? pulse.asset_key}</Link>
                <span className="block text-[11px] text-[#a9b0a3]">{when(pulse.day)}</span>
                <p className="mt-1 text-xs leading-relaxed text-[#d5d0c1]">{pulse.headline}</p>
              </li>
            ))}</ul>
          )}
        </Card>
      );
    }
    case "gainers":
      return <Card title="Biggest risers today" link={{ href: "/admin/market-desk", label: "Rankings" }}><RankList field="change_1d" rows={[...rankings].filter((r) => r.change_1d !== null).sort((a, b) => (b.change_1d ?? 0) - (a.change_1d ?? 0)).slice(0, 5)} /></Card>;
    case "losers":
      return <Card title="Biggest fallers today" link={{ href: "/admin/market-desk", label: "Rankings" }}><RankList field="change_1d" rows={[...rankings].filter((r) => r.change_1d !== null).sort((a, b) => (a.change_1d ?? 0) - (b.change_1d ?? 0)).slice(0, 5)} /></Card>;
    case "top":
      return <Card title="Top ranked" link={{ href: "/admin/market-desk", label: "Rankings" }}><RankList field="score" rows={rankings.slice(0, 5)} /></Card>;
    case "watchlist":
      return (
        <Card title="Watchlist">
          {overview.watchlist.length === 0 ? <p className="text-sm text-[#a9b0a3]">Nothing watched yet. Press the star beside any asset in the Rankings.</p> : (
            <ul className="space-y-2">{overview.watchlist.slice(0, 6).map((item) => <li key={item.asset_key} className="flex items-center justify-between gap-2 text-sm"><Link href={assetHref(item.asset_key)} className="truncate text-[#f1e8d6] hover:text-[#e0c078]">{item.name || item.symbol}</Link><span className={`text-xs ${tone(item.asset?.change_1d)}`}>{pct(item.asset?.change_1d)}</span></li>)}</ul>
          )}
        </Card>
      );
    case "events": {
      const now = data.eventsAt - 3_600_000;
      const upcoming = data.events.filter((event) => event.event_date && new Date(event.event_date).getTime() >= now && (event.impact === "high" || event.impact === "medium")).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()).slice(0, 5);
      return (
        <Card title="Coming up">
          {upcoming.length === 0 ? <p className="text-sm text-[#a9b0a3]">No major events loaded yet.</p> : <ul className="space-y-2">{upcoming.map((event) => <li key={`${event.title}${event.event_date}`} className="text-sm text-[#f1e8d6]"><span className="text-[11px] text-[#a9b0a3]">{when(event.event_date)} · {event.impact}</span><br /><a href={event.source_url.split("#")[0]} target="_blank" rel="noreferrer" className="hover:text-[#e0c078] hover:underline">{event.title}</a></li>)}</ul>}
        </Card>
      );
    }
    case "brief":
      return (
        <Card title="This week's brief" link={{ href: "/admin/market-desk", label: "Read it" }}>
          {data.brief ? <><p className="font-serif text-lg text-[#f1e8d6]">{data.brief.title}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#c9c6ba]">{(data.brief.sections.summary ?? []).slice(0, 4).map((line) => <li key={line}>{line}</li>)}</ul></> : <p className="text-sm text-[#a9b0a3]">No brief yet. One is written every Monday.</p>}
        </Card>
      );
    case "trending":
      return (
        <Card title="Trending coins">
          {stats?.trending.length ? <ul className="space-y-2">{stats.trending.slice(0, 6).map((coin) => <li key={coin.key} className="flex items-center justify-between gap-2 text-sm"><Link href={assetHref(coin.key)} className="truncate text-[#f1e8d6] hover:text-[#e0c078]">{coin.name} <span className="text-[11px] text-[#a9b0a3]">{coin.symbol}</span></Link><span className={`text-xs ${tone(coin.change_24h)}`}>{pct(coin.change_24h)}</span></li>)}</ul> : <p className="text-sm text-[#a9b0a3]">Not available right now.</p>}
        </Card>
      );
  }
}

export function DashboardsTab({ overview, setError, setNotice }: { overview: Overview; setError: (value: string | null) => void; setNotice: (value: string | null) => void }) {
  const [boards, setBoards] = useState<Dashboard[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsAt, setEventsAt] = useState(0);
  const [brief, setBrief] = useState<BriefRow | null>(null);
  const [pulses, setPulses] = useState<Record<string, Pulse>>({});
  const [name, setName] = useState("");

  useEffect(() => {
    void api<{ dashboards: Dashboard[] }>("/api/market-desk/dashboards")
      .then((result) => { setBoards(result.dashboards); setActiveId((current) => current ?? result.dashboards[0]?.id ?? null); })
      .catch((cause: Error) => { setError(cause.message); setBoards([]); });
    void api<{ rows: RankingRow[] }>("/api/market-desk/rankings").then((result) => setRankings(result.rows)).catch(() => undefined);
    void api<{ events: EventRow[] }>("/api/market-desk/events").then((result) => { setEvents(result.events); setEventsAt(Date.now()); }).catch(() => undefined);
    void api<{ brief: BriefRow | null }>("/api/market-desk/brief").then((result) => setBrief(result.brief)).catch(() => undefined);
  }, [setError]);

  const pulseKeys = useMemo(() => [...new Set([...overview.holdings.map((h) => h.asset_key), ...overview.watchlist.map((w) => w.asset_key), ...rankings.slice(0, 4).map((r) => r.key)])].slice(0, 20).join(","), [overview, rankings]);
  useEffect(() => {
    if (!pulseKeys) return;
    void api<{ latest: Record<string, Pulse> }>(`/api/market-desk/pulse?keys=${encodeURIComponent(pulseKeys)}`).then((result) => setPulses(result.latest)).catch(() => undefined);
  }, [pulseKeys]);

  const board = boards?.find((item) => item.id === activeId) ?? boards?.[0] ?? null;

  async function save(next: Dashboard, patch: { name?: string; widgets?: Widget[] }) {
    setBoards((current) => (current ?? []).map((item) => (item.id === next.id ? next : item)));
    try {
      await api("/api/market-desk/dashboards", { method: "PUT", json: { id: next.id, ...patch } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the dashboard.");
    }
  }

  const change = (widgets: Widget[]) => board && void save({ ...board, widgets }, { widgets });
  const move = (index: number, by: -1 | 1) => {
    if (!board) return;
    const target = index + by;
    if (target < 0 || target >= board.widgets.length) return;
    const next = [...board.widgets];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  };

  async function create(copy: boolean) {
    try {
      const label = name.trim() || "New dashboard";
      const result = await api<{ dashboard: Dashboard }>("/api/market-desk/dashboards", { method: "POST", json: { name: label, widgets: copy && board ? board.widgets : [{ id: "w1", type: "market", size: "full" }] } });
      setBoards((current) => [...(current ?? []), result.dashboard]);
      setActiveId(result.dashboard.id);
      setEditing(true);
      setName("");
      setNotice(`Created ${label}. Add the widgets you want, then press Done.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create it.");
    }
  }

  async function remove() {
    if (!board || !window.confirm(`Delete the dashboard "${board.name}"? This cannot be undone.`)) return;
    try {
      await api("/api/market-desk/dashboards", { method: "DELETE", json: { id: board.id } });
      const rest = (boards ?? []).filter((item) => item.id !== board.id);
      setBoards(rest);
      setActiveId(rest[0]?.id ?? null);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete it.");
    }
  }

  if (boards === null) return <p className="text-sm text-[#a9b0a3]">Loading your dashboards...</p>;
  if (!board) return <div className={panelClass}><p className="text-sm text-[#a9b0a3]">Dashboards could not be loaded. If you have not yet, run migration 012 in Supabase.</p></div>;

  const data: Shared = { overview, rankings, events, eventsAt, brief, pulses };
  const used = new Set(board.widgets.map((widget) => widget.type));

  return (
    <div className="space-y-5">
      <section className={panelClass}>
        <div className="flex flex-wrap items-center gap-2">
          {(boards ?? []).map((item) => <button key={item.id} type="button" onClick={() => { setActiveId(item.id); setEditing(false); }} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${item.id === board.id ? "border-[#d4af5a] bg-[#d4af5a]/15 text-[#e0c078]" : "border-[#d4af5a]/25 text-[#a9b0a3] hover:border-[#d4af5a]/60"}`}>{item.name}</button>)}
          <span className="ml-auto flex gap-2">
            <button type="button" className={editing ? primaryButtonClass : ghostButtonClass} onClick={() => setEditing((value) => !value)}>{editing ? "Done" : "Edit layout"}</button>
          </span>
        </div>
        {editing ? (
          <div className="mt-4 space-y-4 border-t border-[#d4af5a]/15 pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="space-y-1.5"><span className="text-[10px] font-semibold tracking-[0.18em] text-[#a9b0a3] uppercase">Name</span><input key={board.id} defaultValue={board.name} maxLength={60} onBlur={(event) => event.target.value.trim() && event.target.value !== board.name && void save({ ...board, name: event.target.value.trim() }, { name: event.target.value })} className={`${fieldClass} max-w-xs`} /></label>
              <button type="button" className={microButtonClass} onClick={() => void remove()} disabled={(boards ?? []).length <= 1}>Delete this dashboard</button>
            </div>
            <div>
              <p className={eyebrowClass}>Add a widget</p>
              <div className="mt-2 flex flex-wrap gap-2">{CATALOGUE.map((item) => <button key={item.type} type="button" title={item.about} disabled={used.has(item.type)} onClick={() => change([...board.widgets, { id: `w${Date.now().toString(36)}`, type: item.type, size: item.type === "market" || item.type === "pulse" ? "full" : "half" }])} className={`${microButtonClass} disabled:opacity-40`}>+ {item.title}</button>)}</div>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-[#d4af5a]/10 pt-3">
              <label className="space-y-1.5"><span className="text-[10px] font-semibold tracking-[0.18em] text-[#a9b0a3] uppercase">New dashboard</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="For example: Morning check" maxLength={60} className={`${fieldClass} max-w-xs`} /></label>
              <button type="button" className={microButtonClass} onClick={() => void create(false)}>Start empty</button>
              <button type="button" className={microButtonClass} onClick={() => void create(true)}>Copy this one</button>
            </div>
          </div>
        ) : null}
      </section>

      {board.widgets.length === 0 ? <div className={panelClass}><p className="text-sm text-[#a9b0a3]">This dashboard is empty. Press Edit layout and add some widgets.</p></div> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {board.widgets.map((widget, index) => (
            <div key={widget.id} className={`${widget.size === "full" ? "lg:col-span-2" : ""} ${editing ? "rounded-2xl ring-1 ring-[#d4af5a]/40" : ""}`}>
              {editing ? (
                <div className="mb-1 flex flex-wrap items-center gap-1.5 px-1 text-[11px] text-[#a9b0a3]">
                  <span className="mr-auto font-semibold text-[#e0c078]">{titleOf(widget.type)}</span>
                  <button type="button" className={microButtonClass} onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier">↑</button>
                  <button type="button" className={microButtonClass} onClick={() => move(index, 1)} disabled={index === board.widgets.length - 1} aria-label="Move later">↓</button>
                  <button type="button" className={microButtonClass} onClick={() => change(board.widgets.map((w) => (w.id === widget.id ? { ...w, size: w.size === "full" ? "half" : "full" } : w)))}>{widget.size === "full" ? "Make half width" : "Make full width"}</button>
                  <button type="button" className={microButtonClass} onClick={() => change(board.widgets.filter((w) => w.id !== widget.id))} aria-label={`Remove ${titleOf(widget.type)}`}>Remove</button>
                </div>
              ) : null}
              <WidgetBody type={widget.type} data={data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
