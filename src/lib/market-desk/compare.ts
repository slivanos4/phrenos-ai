import { computeMetrics } from "@/lib/market-desk/metrics";
import { fetchSeries } from "@/lib/market-desk/providers";
import { listRankings } from "@/lib/market-desk/rankings";
import type { AssetType } from "@/lib/market-desk/types";

/** Two to four assets side by side: how each has moved from a common starting point, key figures, and how closely they move together. */
export type CompareAsset = {
  key: string;
  name: string;
  symbol: string;
  asset_type: AssetType;
  currency: string;
  price: number;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  return_1y: number | null;
  vol_30d: number | null;
  drawdown_1y: number | null;
  vs_sma200: number | null;
  risk_label: string;
  risk_score: number;
  score: number | null;
  view: string | null;
  market_cap_gbp: number | null;
};

export type Compare = {
  assets: CompareAsset[];
  /** Dates every chosen asset has a price for, oldest first. Crypto trades every day and shares only trading days with the rest. */
  dates: string[];
  closes: Record<string, number[]>;
  correlation: { a: string; b: string; value: number | null }[];
  skipped: { key: string; reason: string }[];
};

function correlation(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n < 20) return null;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const denominator = Math.sqrt(sxx * syy);
  return denominator > 0 ? sxy / denominator : null;
}

const returns = (closes: number[]) => closes.slice(1).map((value, index) => value / closes[index] - 1);

export async function buildCompare(keys: string[]): Promise<Compare> {
  const unique = [...new Set(keys)].slice(0, 4);
  if (unique.length < 2) throw new Error("Choose at least two assets to compare.");
  const [settled, rankings] = await Promise.all([
    Promise.allSettled(unique.map((key) => fetchSeries(key))),
    listRankings().catch(() => []),
  ]);

  const skipped: Compare["skipped"] = [];
  const loaded = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    skipped.push({ key: unique[index], reason: result.reason instanceof Error ? result.reason.message : "no data" });
    return [];
  });
  if (loaded.length < 2) throw new Error(`Could not load enough price history to compare. ${skipped.map((s) => `${s.key}: ${s.reason}`).join("; ")}`);

  const maps = loaded.map((series) => new Map(series.dates.map((date, index) => [date, series.closes[index]])));
  const dates = loaded[0].dates.filter((date) => maps.every((map) => map.has(date)));
  if (dates.length < 10) throw new Error("These assets share too few trading days to compare. Try assets of a similar kind.");

  const closes: Record<string, number[]> = {};
  loaded.forEach((series, index) => { closes[series.key] = dates.map((date) => maps[index].get(date) as number); });

  const assets: CompareAsset[] = loaded.map((series) => {
    const metrics = computeMetrics(series);
    const ranked = rankings.find((row) => row.key === series.key);
    return {
      key: series.key,
      name: series.name,
      symbol: series.symbol,
      asset_type: series.type,
      currency: series.currency,
      price: metrics.price,
      change_1d: metrics.change_1d,
      change_7d: metrics.change_7d,
      change_30d: metrics.change_30d,
      change_90d: metrics.change_90d,
      return_1y: series.closes.length > 200 ? series.closes[series.closes.length - 1] / series.closes[0] - 1 : null,
      vol_30d: metrics.vol_30d,
      drawdown_1y: metrics.drawdown_1y,
      vs_sma200: metrics.sma200 ? metrics.price / metrics.sma200 - 1 : null,
      risk_label: metrics.risk_label,
      risk_score: metrics.risk_score,
      score: ranked?.score ?? null,
      view: ranked?.view ?? null,
      market_cap_gbp: ranked?.market_cap_gbp ?? null,
    };
  });

  const pairs: Compare["correlation"] = [];
  for (let i = 0; i < assets.length; i += 1) {
    for (let j = i + 1; j < assets.length; j += 1) {
      pairs.push({ a: assets[i].key, b: assets[j].key, value: correlation(returns(closes[assets[i].key]), returns(closes[assets[j].key])) });
    }
  }
  return { assets, dates, closes, correlation: pairs, skipped };
}
