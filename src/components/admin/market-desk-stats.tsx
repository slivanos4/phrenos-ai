"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketStats } from "@/lib/market-desk/market-stats";
import { api, eyebrowClass, panelClass, pct, tone, when } from "@/components/admin/market-desk-ui";

export type Currency = "GBP" | "USD" | "EUR";
export const SYMBOL: Record<Currency, string> = { GBP: "£", USD: "$", EUR: "€" };

/** Turns a pound amount into the chosen currency using the rates in the market strip. */
export function makeMoney(currency: Currency, rates: MarketStats["rates"] | null) {
  const rate = currency === "GBP" ? 1 : (rates?.[currency] ?? null);
  const sym = SYMBOL[currency];
  const convert = (gbp: number | null | undefined) => (gbp === null || gbp === undefined || rate === null ? null : gbp * rate);
  const price = (gbp: number | null | undefined) => {
    const v = convert(gbp);
    if (v === null) return "n/a";
    const digits = v >= 100 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
    return `${sym}${v.toLocaleString("en-GB", { minimumFractionDigits: digits === 0 ? 0 : 2, maximumFractionDigits: digits })}`;
  };
  const compact = (gbp: number | null | undefined) => {
    const v = convert(gbp);
    if (v === null) return "n/a";
    if (v >= 1e12) return `${sym}${(v / 1e12).toFixed(2)}tn`;
    if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}bn`;
    if (v >= 1e6) return `${sym}${(v / 1e6).toFixed(0)}m`;
    return `${sym}${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  };
  return { price, compact, rate };
}

/** Loads the market-wide numbers once and shares them. A failed feed leaves that part blank instead of breaking the page. */
export function useMarketStats() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  useEffect(() => {
    void api<{ stats: MarketStats }>("/api/market-desk/market-stats").then((result) => setStats(result.stats)).catch(() => undefined);
  }, []);
  return stats;
}

function Thumb({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={18} height={18} className="shrink-0 rounded-full" loading="lazy" />;
}

function fearTone(value: number): string {
  return value < 25 ? "text-[#e8b4a0]" : value < 45 ? "text-[#e8a070]" : value < 55 ? "text-[#e0c078]" : value < 75 ? "text-[#a9d1b4]" : "text-[#8fbf9f]";
}

/** The strip above the rankings: the whole market at a glance, with how many of our scanned assets are rising. */
export function MarketStrip({ stats, currency, breadth, timeframe }: { stats: MarketStats | null; currency: Currency; breadth: { up: number; down: number; total: number } | null; timeframe: string }) {
  const money = makeMoney(currency, stats?.rates ?? null);
  const fg = stats?.fear_greed;
  const upShare = breadth && breadth.total > 0 ? breadth.up / breadth.total : null;
  return (
    <section className="grid gap-3 lg:grid-cols-4">
      <div className={panelClass}>
        <p className={eyebrowClass}>Crypto market value</p>
        {stats?.global ? (
          <>
            <p className="mt-2 font-serif text-3xl text-[#f1e8d6]">{money.compact(stats.global.market_cap_gbp)}</p>
            <p className={`text-sm ${tone(stats.global.change_24h)}`}>{pct(stats.global.change_24h)} <span className="text-[11px] text-[#a9b0a3]">in 24 hours</span></p>
            <p className="mt-2 text-[11px] text-[#a9b0a3]">Traded in 24h {money.compact(stats.global.volume_gbp)} · Bitcoin is {stats.global.btc_dominance?.toFixed(1)}% of it</p>
          </>
        ) : <p className="mt-2 text-sm text-[#a9b0a3]">{stats ? "Not available right now." : "Loading..."}</p>}
      </div>

      <div className={panelClass}>
        <p className={eyebrowClass}>Fear and Greed</p>
        {fg ? (
          <>
            <p className={`mt-2 font-serif text-3xl ${fearTone(fg.value)}`}>{fg.value} <span className="text-base">{fg.label}</span></p>
            <div className="relative mt-3 h-2 rounded-full bg-[linear-gradient(90deg,#e8b4a0,#e0c078_50%,#8fbf9f)]" role="img" aria-label={`Fear and Greed ${fg.value} out of 100`}>
              <span className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-[#f1e8d6] shadow" style={{ left: `calc(${fg.value}% - 3px)` }} />
            </div>
            <p className="mt-2 text-[11px] text-[#a9b0a3]">Yesterday {fg.yesterday ?? "n/a"} · a week ago {fg.last_week ?? "n/a"}. A crypto sentiment reading from alternative.me.</p>
          </>
        ) : <p className="mt-2 text-sm text-[#a9b0a3]">{stats ? "Not available right now." : "Loading..."}</p>}
      </div>

      <div className={panelClass}>
        <p className={eyebrowClass}>How many are rising</p>
        {upShare !== null && breadth ? (
          <>
            <p className="mt-2 font-serif text-3xl text-[#f1e8d6]">{Math.round(upShare * 100)}% <span className="text-base text-[#a9b0a3]">up</span></p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#e8b4a0]/70"><span className="block bg-[#8fbf9f]" style={{ width: `${upShare * 100}%` }} /></div>
            <p className="mt-2 text-[11px] text-[#a9b0a3]">{breadth.up} of {breadth.total} scanned assets are up over {timeframe}, {breadth.down} are down. Counted from our own scan, not trading orders.</p>
          </>
        ) : <p className="mt-2 text-sm text-[#a9b0a3]">Loading...</p>}
      </div>

      <div className={panelClass}>
        <p className={eyebrowClass}>Trending on CoinGecko</p>
        {stats?.trending.length ? (
          <ul className="mt-2 space-y-1.5">
            {stats.trending.slice(0, 5).map((coin) => (
              <li key={coin.key}>
                <Link href={`/admin/market-desk/asset?key=${encodeURIComponent(coin.key)}`} className="flex items-center justify-between gap-2 text-sm text-[#f1e8d6] hover:text-[#e0c078]">
                  <span className="flex min-w-0 items-center gap-2">
                    {coin.image ? <Thumb src={coin.image} /> : null}
                    <span className="truncate">{coin.name}</span>
                  </span>
                  <span className={`text-xs ${tone(coin.change_24h)}`}>{pct(coin.change_24h)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-[#a9b0a3]">{stats ? "Not available right now." : "Loading..."}</p>}
      </div>
      {stats ? <p className="text-[11px] text-[#a9b0a3] lg:col-span-4">Market figures from CoinGecko and alternative.me, updated {when(stats.fetched_at)} and refreshed every 10 minutes while you browse.{stats.problems.length > 0 ? ` Unavailable just now: ${stats.problems.map((p) => p.split(":")[0]).join(", ")}.` : ""}</p> : null}
    </section>
  );
}
