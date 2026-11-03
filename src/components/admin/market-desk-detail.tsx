"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Detail } from "@/lib/market-desk/detail";
import {
  Disclaimer,
  RiskBadge,
  RiskMeter,
  api,
  eyebrowClass,
  gbp,
  panelClass,
  pct,
  price,
  tone,
  when,
} from "@/components/admin/market-desk-ui";

const LINE_COLOURS = { buy: "#e0c078", high: "#8fbf9f", warn: "#e8b4a0", avg: "#a9b0a3" } as const;

/** Price line for the last year with the key levels marked, so you can see what the warning is measuring. */
function Chart({ detail }: { detail: Detail }) {
  const { closes, dates } = detail.chart;
  const width = 760;
  const height = 260;
  const pad = { left: 8, right: 8, top: 12, bottom: 22 };
  const levels = detail.lines.map((line) => line.value);
  const min = Math.min(...closes, ...levels);
  const max = Math.max(...closes, ...levels);
  const span = max - min || 1;
  const x = (index: number) => pad.left + (index / (closes.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
  const points = closes.map((close, index) => `${x(index).toFixed(1)},${y(close).toFixed(1)}`).join(" ");
  const label = (value: string) => new Date(value).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Price of ${detail.asset.name} over the last year`}>
        {detail.lines.map((line) => (
          <line key={line.label} x1={pad.left} x2={width - pad.right} y1={y(line.value)} y2={y(line.value)} stroke={LINE_COLOURS[line.tone]} strokeWidth="1" strokeDasharray="5 4" opacity="0.85" />
        ))}
        <polyline points={points} fill="none" stroke="#f1e8d6" strokeWidth="1.6" strokeLinejoin="round" />
        <text x={pad.left} y={height - 6} fontSize="10" fill="#a9b0a3">{label(dates[0])}</text>
        <text x={width - pad.right} y={height - 6} fontSize="10" fill="#a9b0a3" textAnchor="end">{label(dates[dates.length - 1])}</text>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#c9c6ba]">
        <li><span className="mr-1.5 inline-block h-0.5 w-4 bg-[#f1e8d6] align-middle" />Price</li>
        {detail.lines.map((line) => (
          <li key={line.label}><span className="mr-1.5 inline-block h-0.5 w-4 align-middle" style={{ background: LINE_COLOURS[line.tone] }} />{line.label}</li>
        ))}
      </ul>
    </div>
  );
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
      <Link href="/admin/market-desk" className="text-[11px] font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline">← Back to Market Desk</Link>

      <header>
        <h1 className="font-serif text-3xl text-[#f1e8d6]">{asset.name}</h1>
        <p className="mt-1 text-sm text-[#a9b0a3]">{asset.symbol} · {asset.asset_type} · {price(asset.price, asset.currency)}{asset.price_gbp ? ` (${gbp(asset.price_gbp)})` : ""} · prices updated {when(asset.updated_at)}</p>
      </header>

      {alert ? (
        <section className="rounded-2xl border border-[#e0c078]/50 bg-[#e0c078]/8 p-5">
          <p className={eyebrowClass}>Why you were warned</p>
          <p className="mt-2 text-base font-semibold text-[#f1e8d6]">{alert.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#d5d0c1]">{alert.message}</p>
          {detail.rule ? <p className="mt-3 text-xs leading-relaxed text-[#a9b0a3]"><span className="font-semibold text-[#e0c078]">The rule:</span> {detail.rule} You can change the limits under Alerts and settings.</p> : null}
        </section>
      ) : null}

      <section className={panelClass}>
        <p className={eyebrowClass}>Price over the last year</p>
        <div className="mt-3"><Chart detail={detail} /></div>
        <p className="mt-3 text-[11px] text-[#a9b0a3]">Daily closing prices in {asset.currency}. Dashed lines mark the levels the warnings are measured against.</p>
      </section>

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

      <section className={panelClass}>
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

      <section className={panelClass}>
        <p className={eyebrowClass}>Check the numbers yourself</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {detail.links.map((link) => <li key={link.url}><ExternalLink href={link.url}>{link.label}</ExternalLink></li>)}
        </ul>
      </section>
      <Disclaimer />
    </div>
  );
}
