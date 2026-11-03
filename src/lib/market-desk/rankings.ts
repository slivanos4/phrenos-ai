import { callAnthropic, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { computeMetrics, riskLabelFor } from "@/lib/market-desk/metrics";
import { getYahooSession } from "@/lib/market-desk/options";
import { fxRate, yahooSeries } from "@/lib/market-desk/providers";
import { listSignals } from "@/lib/market-desk/signals";
import { T } from "@/lib/market-desk/store";
import { COMMODITIES, ETFS, STOCKS } from "@/lib/market-desk/universe";
import type { AssetType } from "@/lib/market-desk/types";

/**
 * Research rankings: every asset in the scan gets an evidence score from 0 to 100, and the list is ordered by it.
 * The score rewards steady gains for the amount of risk taken, an established uptrend, trends that agree across
 * time frames, and bullish smart-money signals. It is a description of what the data shows, not a prediction.
 */
export type RankingRow = {
  key: string;
  rank: number;
  score: number;
  view: string;
  name: string;
  symbol: string;
  asset_type: AssetType;
  image: string | null;
  currency: string;
  price: number | null;
  price_gbp: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  market_cap_gbp: number | null;
  volume_gbp: number | null;
  risk_label: string | null;
  risk_score: number | null;
  vs_sma200: number | null;
  drawdown_1y: number | null;
  year_high: number | null;
  year_low: number | null;
  history: number[];
  strengths: string[];
  concerns: string[];
  watch_for: string[];
  note: string;
  note_updated_at: string | null;
  updated_at: string;
};

type Candidate = Omit<RankingRow, "rank" | "score" | "view" | "strengths" | "concerns" | "watch_for" | "note" | "note_updated_at" | "updated_at"> & {
  vol30: number | null;
  vsSma50: number | null;
  sma50Above200: boolean | null;
  trendUp200: boolean;
  trendUp50: boolean;
  momentum: number;
};

/** More names than the weekly scan, to give the list real breadth. Names come from Yahoo itself. */
const EXTRA_STOCKS = [
  "ADBE", "INTC", "DIS", "BA", "PFE", "KO", "PEP", "MCD", "NKE", "CVX", "GS", "BAC", "MA", "HD", "UBER", "NOW", "QCOM", "TXN",
  "MU", "AMAT", "ISRG", "NVO", "TSM", "CRWD", "PANW", "TSCO.L", "DGE.L", "BA.L", "CPG.L", "RKT.L", "STAN.L", "NWG.L", "PRU.L",
  "EXPN.L", "SAN.PA", "BNP.PA", "SU.PA", "DTE.DE", "MBG.DE", "BMW.DE", "IFX.DE", "RMS.PA", "INGA.AS", "UCG.MI", "IBE.MC",
];

const STABLE = /^(usdt|usdc|dai|usde|fdusd|tusd|usds|pyusd|usd1|usdd|usdt0|usdc\.e)$/i;
const pctText = (value: number) => `${Math.abs(value * 100).toFixed(0)}%`;

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = await Promise.all(items.slice(index, index + size).map((item) => work(item).catch((): null => null)));
    for (const entry of batch) if (entry !== null) out.push(entry as R);
  }
  return out;
}

async function yahooQuotes(symbols: string[]): Promise<Map<string, { marketCap: number | null; volume: number | null; currency: string }>> {
  const out = new Map<string, { marketCap: number | null; volume: number | null; currency: string }>();
  const auth = await getYahooSession();
  if (!auth) return out;
  for (let index = 0; index < symbols.length; index += 40) {
    const batch = symbols.slice(index, index + 40);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch.join(","))}&crumb=${encodeURIComponent(auth.crumb)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)", Cookie: auth.cookie }, signal: AbortSignal.timeout(20000) },
    ).catch(() => null);
    if (!response?.ok) continue;
    const body = (await response.json()) as { quoteResponse?: { result?: { symbol: string; marketCap?: number; regularMarketVolume?: number; currency?: string; regularMarketPrice?: number }[] } };
    for (const quote of body.quoteResponse?.result ?? []) {
      out.set(quote.symbol, { marketCap: quote.marketCap ?? null, volume: quote.regularMarketVolume && quote.regularMarketPrice ? quote.regularMarketVolume * quote.regularMarketPrice : null, currency: quote.currency ?? "USD" });
    }
  }
  return out;
}

async function gatherYahoo(): Promise<Candidate[]> {
  const list: { symbol: string; name?: string; type?: AssetType }[] = [
    ...STOCKS.map(([symbol, name]) => ({ symbol, name })),
    ...EXTRA_STOCKS.map((symbol) => ({ symbol })),
    ...ETFS.map(([symbol, name, type]) => ({ symbol, name, type })),
    ...COMMODITIES.map(([symbol, name]) => ({ symbol, name, type: "commodity" as AssetType })),
  ];
  const rates = new Map<string, number>();
  const toGbp = async (currency: string) => {
    if (!rates.has(currency)) rates.set(currency, await fxRate(currency, "GBP").catch(() => 1));
    return rates.get(currency) ?? 1;
  };

  const candidates = await inBatches(list, 8, async (entry) => {
    const series = await yahooSeries(entry.symbol);
    if (entry.type) series.type = entry.type;
    const metrics = computeMetrics(series);
    const closes = series.closes;
    const rate = await toGbp(series.currency);
    const last250 = closes.slice(-250);
    return {
      key: series.key,
      name: entry.name ?? series.name,
      symbol: series.symbol,
      asset_type: series.type,
      image: null,
      currency: series.currency,
      price: metrics.price,
      price_gbp: metrics.price * rate,
      change_1d: metrics.change_1d,
      change_7d: metrics.change_7d,
      change_30d: metrics.change_30d,
      change_90d: metrics.change_90d,
      market_cap_gbp: null as number | null,
      volume_gbp: null as number | null,
      risk_label: metrics.risk_label,
      risk_score: metrics.risk_score,
      vs_sma200: metrics.sma200 ? metrics.price / metrics.sma200 - 1 : null,
      drawdown_1y: metrics.drawdown_1y,
      year_high: Math.max(...last250),
      year_low: Math.min(...last250),
      history: closes.slice(-90).map((value) => Number(value.toPrecision(5))),
      vol30: metrics.vol_30d,
      vsSma50: metrics.sma50 ? metrics.price / metrics.sma50 - 1 : null,
      sma50Above200: metrics.sma50 && metrics.sma200 ? metrics.sma50 > metrics.sma200 : null,
      trendUp200: metrics.sma200 ? metrics.price > metrics.sma200 : false,
      trendUp50: metrics.sma50 ? metrics.price > metrics.sma50 : false,
      momentum: 0.5 * (metrics.change_90d ?? 0) + 0.3 * (metrics.change_30d ?? 0) + 0.2 * (metrics.sma200 ? metrics.price / metrics.sma200 - 1 : 0),
    } satisfies Candidate;
  });

  const quotes = await yahooQuotes(candidates.filter((c) => c.asset_type === "stock" || c.asset_type === "etf").map((c) => c.symbol));
  for (const candidate of candidates) {
    const quote = quotes.get(candidate.symbol);
    if (!quote) continue;
    const currency = quote.currency === "GBp" ? "GBP" : quote.currency;
    const rate = await toGbp(currency);
    candidate.market_cap_gbp = quote.marketCap ? quote.marketCap * rate : null;
    candidate.volume_gbp = quote.volume ? quote.volume * (quote.currency === "GBp" ? 0.01 : 1) * rate : null;
  }
  return candidates;
}

type CgRow = {
  id: string; symbol: string; name: string; image?: string; current_price: number; market_cap: number; total_volume: number; market_cap_rank: number | null;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_200d_in_currency?: number | null;
  high_24h?: number; low_24h?: number; ath_change_percentage?: number | null;
};

async function gatherCrypto(): Promise<Candidate[]> {
  const key = process.env.COINGECKO_API_KEY?.trim();
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=gbp&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d,30d,200d",
    { headers: { "User-Agent": "PhrenosMarketDesk/1.0", ...(key ? { "x-cg-demo-api-key": key } : {}) }, signal: AbortSignal.timeout(25000), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
  const rows = ((await response.json()) as CgRow[]).filter((row) => !STABLE.test(row.symbol));
  const eur = await fxRate("GBP", "EUR").catch(() => 1.17);
  void eur;

  return rows.map((row) => {
    const c24 = (row.price_change_percentage_24h_in_currency ?? 0) / 100;
    const c7 = (row.price_change_percentage_7d_in_currency ?? 0) / 100;
    const c30 = (row.price_change_percentage_30d_in_currency ?? 0) / 100;
    const c200 = (row.price_change_percentage_200d_in_currency ?? 0) / 100;
    const prices = row.sparkline_in_7d?.price ?? [];
    let vol: number | null = null;
    if (prices.length > 24) {
      const returns = prices.slice(1).map((value, index) => Math.log(value / prices[index]));
      const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
      vol = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length) * Math.sqrt(8760);
    }
    // No long daily history in this one call, so risk is estimated from recent swings, market size and the 200-day move.
    const rank = row.market_cap_rank ?? 100;
    const rankAdd = rank <= 10 ? 0 : rank <= 30 ? 6 : rank <= 60 ? 12 : 18;
    const score = Math.round(Math.min(100, Math.min(100, (vol ?? 0.7) * 160) * 0.4 + 60 * 0.3 + rankAdd + (c200 < 0 ? 8 : 0)));
    return {
      key: `cg:${row.id}`,
      name: row.name,
      symbol: row.symbol.toUpperCase(),
      asset_type: "crypto" as const,
      image: row.image ?? null,
      currency: "GBP",
      price: row.current_price,
      price_gbp: row.current_price,
      change_1d: c24,
      change_7d: c7,
      change_30d: c30,
      change_90d: null,
      market_cap_gbp: row.market_cap,
      volume_gbp: row.total_volume,
      risk_label: riskLabelFor(score),
      risk_score: score,
      vs_sma200: null,
      drawdown_1y: row.ath_change_percentage ? row.ath_change_percentage / 100 : null,
      year_high: null,
      year_low: null,
      history: prices.filter((_, index) => index % 4 === 0).map((value) => Number(value.toPrecision(5))),
      vol30: vol,
      vsSma50: null,
      sma50Above200: null,
      trendUp200: c200 > 0,
      trendUp50: c30 > 0,
      momentum: 0.45 * c200 + 0.35 * c30 + 0.2 * c7,
    } satisfies Candidate;
  });
}

type Signal = { symbol: string; signal_type: string; direction: string; strength: number; summary: string };

export function scoreCandidates(candidates: Candidate[], signals: Signal[]) {
  const riskAdjusted = candidates.map((c) => c.momentum / Math.max(c.vol30 ?? 0.3, c.asset_type === "crypto" ? 0.2 : 0.1));
  const sorted = [...riskAdjusted].sort((a, b) => a - b);
  const percentile = (value: number) => sorted.filter((other) => other <= value).length / sorted.length;

  const bySymbol = new Map<string, Signal[]>();
  for (const signal of signals) bySymbol.set(signal.symbol, [...(bySymbol.get(signal.symbol) ?? []), signal]);

  return candidates.map((c, index) => {
    const pr = percentile(riskAdjusted[index]);
    const trend = c.sma50Above200 === null
      ? (c.trendUp200 ? 0.5 : 0) + (c.trendUp50 ? 0.5 : 0)
      : (c.trendUp200 ? 0.5 : 0) + (c.trendUp50 ? 0.25 : 0) + (c.sma50Above200 ? 0.25 : 0);
    const longMove = c.change_90d ?? (c.trendUp200 ? 1 : -1);
    const consistency = ((c.change_30d ?? 0) > 0 ? 0.5 : 0) + (longMove > 0 ? 0.5 : 0);
    const own = bySymbol.get(c.symbol) ?? [];
    const signalScore = Math.max(0, Math.min(1, 0.5 + own.reduce((sum, s) => sum + (s.direction === "bullish" ? 1 : s.direction === "bearish" ? -1 : 0) * s.strength, 0) / 12));
    const overextended = (c.change_90d ?? 0) > 0.8 || (c.change_30d ?? 0) > 0.6;
    let score = 100 * (0.55 * pr + 0.2 * trend + 0.15 * consistency + 0.1 * signalScore);
    if (overextended) score *= 0.9;
    const smallCrypto = c.asset_type === "crypto" && (c.market_cap_gbp ?? 0) < 2e9;
    if (smallCrypto) score *= 0.8;
    score = Math.round(Math.max(0, Math.min(100, score)));

    const strengths: string[] = [];
    const concerns: string[] = [];
    const watch: string[] = [];
    if ((c.change_90d ?? 0) > 0.05) strengths.push(`Up ${pctText(c.change_90d ?? 0)} over 3 months.`);
    else if (c.change_90d === null && (c.change_30d ?? 0) > 0.05) strengths.push(`Up ${pctText(c.change_30d ?? 0)} over the last month.`);
    if (pr >= 0.8) strengths.push(`Its gains are strong for the risk taken: in the top ${Math.max(1, Math.round((1 - pr) * 100) + 1)}% of ${candidates.length} assets scanned.`);
    if (c.trendUp200 && c.trendUp50) strengths.push("Trading above both its 50-day and 200-day averages, an established uptrend.");
    if ((c.change_30d ?? 0) > 0 && longMove > 0) strengths.push("The 1-month and longer trends both point up.");
    for (const s of own.filter((x) => x.direction === "bullish")) strengths.push(s.summary);

    if (overextended) concerns.push("It has already risen sharply, so some of the move may be done and a pullback is more likely than usual.");
    if (!c.trendUp200) concerns.push("Trading below its 200-day average, which is a downtrend.");
    if ((c.change_30d ?? 0) < -0.05) concerns.push(`Down ${pctText(c.change_30d ?? 0)} in the last month.`);
    if ((c.vol30 ?? 0) > 0.5) concerns.push(`Very large price swings: ${((c.vol30 ?? 0) * 100).toFixed(0)}% annualised.`);
    if (c.drawdown_1y !== null && c.drawdown_1y < -0.3) concerns.push(`Fell ${pctText(c.drawdown_1y)} from its high at the worst point.`);
    for (const s of own.filter((x) => x.direction === "bearish")) concerns.push(s.summary);
    if (smallCrypto) concerns.push("Small market size: it is easier to push around and harder to sell in a hurry.");
    if (c.asset_type === "stock") concerns.push("This score looks only at price behaviour and smart-money signals, not whether the company's price is fair for its earnings.");
    if (c.asset_type === "crypto") concerns.push("Crypto has no earnings or central bank behind it and can fall very fast. Its risk score here is estimated from recent swings and market size.");

    if (c.trendUp200) watch.push("A close below its 200-day average would turn the trend down.");
    watch.push("A sharp rise in price swings, or a big drop in a single day, would raise the risk.");
    if (c.asset_type === "stock") watch.push("Company results and guidance can overturn a trend overnight.");

    const view = "";
    return { candidate: c, score, view, strengths: strengths.slice(0, 5), concerns: concerns.slice(0, 5), watch: watch.slice(0, 3), tie: riskAdjusted[index], own };
  });
}

const NOTE_RULES = `You are writing short research notes for a private market dashboard used by one person. For each asset, write a note of 3 or 4 plain British English sentences: why it ranks where it does, the strongest argument against it, and what would change the view.

RULES: This is research, not financial advice. Never say buy, sell, hold, or what to invest. No price targets or promised returns. Use ONLY numbers that appear in the data given. Do not mention any company event, news or number not in the data. No em dashes or en dashes.

Return ONLY a JSON object mapping each asset "key" to its note string.`;

async function writeNotes(top: ReturnType<typeof scoreCandidates>): Promise<Record<string, string>> {
  const payload = top.map(({ candidate: c, score, view, strengths, concerns }) => ({
    key: c.key, name: c.name, symbol: c.symbol, type: c.asset_type, score_out_of_100: score, view, risk: `${c.risk_label} (${c.risk_score}/100)`,
    change_30d_pct: c.change_30d === null ? null : Number((c.change_30d * 100).toFixed(1)),
    change_90d_pct: c.change_90d === null ? null : Number((c.change_90d * 100).toFixed(1)),
    strengths, concerns,
  }));
  const text = await callAnthropic(`${NOTE_RULES}\n\nDATA:\n${JSON.stringify(payload)}`, 7000);
  const json = extractJsonObject(text);
  return json ? (JSON.parse(json) as Record<string, string>) : {};
}

/** The scan and the scoring, without saving anything. */
export async function computeRankings() {
  const [yahoo, crypto, signals] = await Promise.all([
    gatherYahoo(),
    gatherCrypto().catch((error) => { console.warn("Crypto rankings skipped:", error); return [] as Candidate[]; }),
    listSignals(200).catch(() => []),
  ]);
  const sorted = scoreCandidates([...yahoo, ...crypto], signals as Signal[]).sort((a, b) => b.score - a.score || b.tie - a.tie);
  // Labels follow both the score and the position, so only the top tenth can be called strongest.
  return sorted.map((entry, index) => ({
    ...entry,
    view: entry.score >= 80 && index < sorted.length * 0.1 ? "Strongest evidence" : entry.score >= 60 ? "Positive" : entry.score >= 40 ? "Mixed" : "Weak evidence",
  }));
}

/** Scans the whole universe, scores and orders it, and saves the list. Notes (one AI call) are written weekly. */
export async function refreshRankings(options: { notes?: boolean } = {}): Promise<{ ranked: number; noted: number }> {
  const startedAt = new Date().toISOString();
  const scored = await computeRankings();

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase.from(T.rankings).select("key, note, note_updated_at");
  const oldNotes = new Map((existing ?? []).map((row) => [String(row.key), { note: String(row.note ?? ""), at: (row.note_updated_at as string | null) ?? null }]));

  let notes: Record<string, string> = {};
  if (options.notes) notes = await writeNotes(scored.slice(0, 20)).catch((error) => { console.warn("Ranking notes failed:", error); return {}; });

  const now = new Date().toISOString();
  const rows = scored.map(({ candidate: c, score, view, strengths, concerns, watch }, index) => {
    const fresh = notes[c.key];
    const old = oldNotes.get(c.key);
    const { vol30, vsSma50, sma50Above200, trendUp200, trendUp50, momentum, ...rest } = c;
    void vol30; void vsSma50; void sma50Above200; void trendUp200; void trendUp50; void momentum;
    return {
      ...rest,
      rank: index + 1,
      score,
      view,
      strengths,
      concerns,
      watch_for: watch,
      note: fresh ?? old?.note ?? "",
      note_updated_at: fresh ? now : (old?.at ?? null),
      updated_at: now,
    };
  });

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabase.from(T.rankings).upsert(rows.slice(index, index + 100));
    if (error) throw new Error(/phrenos_market_rankings/.test(error.message) ? "The rankings table is missing. Run supabase/migrations/009_market_rankings.sql in Supabase." : error.message);
  }
  await supabase.from(T.rankings).delete().lt("updated_at", startedAt);
  return { ranked: rows.length, noted: Object.keys(notes).length };
}

export async function listRankings(): Promise<RankingRow[]> {
  const { data, error } = await createServiceRoleClient().from(T.rankings).select("*").order("rank", { ascending: true });
  if (error) throw new Error(/phrenos_market_rankings/.test(error.message) ? "The rankings table is missing. Run supabase/migrations/009_market_rankings.sql in Supabase." : error.message);
  const n = (value: unknown) => (value === null || value === undefined ? null : Number(value));
  return (data ?? []).map((row) => ({
    ...(row as unknown as RankingRow),
    price: n(row.price), price_gbp: n(row.price_gbp), change_1d: n(row.change_1d), change_7d: n(row.change_7d), change_30d: n(row.change_30d), change_90d: n(row.change_90d),
    market_cap_gbp: n(row.market_cap_gbp), volume_gbp: n(row.volume_gbp), vs_sma200: n(row.vs_sma200), drawdown_1y: n(row.drawdown_1y), year_high: n(row.year_high), year_low: n(row.year_low),
    history: ((row.history as number[]) ?? []).map(Number),
  }));
}

export async function rankingFor(key: string): Promise<RankingRow | null> {
  const rows = await listRankings().catch(() => [] as RankingRow[]);
  return rows.find((row) => row.key === key) ?? null;
}
