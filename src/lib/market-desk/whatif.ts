import { fetchSeries } from "@/lib/market-desk/providers";
import { yahooSeries } from "@/lib/market-desk/providers";

export type WhatIf = {
  symbol: string;
  name: string;
  currency: string;
  years: number;
  months: number;
  amount: number;
  windows: number;
  worst: number;
  p10: number;
  median: number;
  p90: number;
  best: number;
  lossShare: number;
  note: string;
};

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

/**
 * Looks back over every possible start date and shows how a holding period of this length turned out.
 * It is a record of what already happened, never a forecast.
 */
export async function whatIf(key: string, amount: number, months: number): Promise<WhatIf> {
  const series = key.startsWith("yahoo:") ? await yahooSeries(key.slice(6), "5y") : await fetchSeries(key);
  const perMonth = key.startsWith("cg:") ? 30 : 21;
  const span = Math.max(1, Math.round(months * perMonth));
  const closes = series.closes;
  if (closes.length <= span + 5) {
    throw new Error("Not enough price history to look back over that period. Try a shorter period.");
  }
  const results: number[] = [];
  for (let start = 0; start + span < closes.length; start += 1) {
    results.push(closes[start + span] / closes[start] - 1);
  }
  const sorted = [...results].sort((a, b) => a - b);
  return {
    symbol: series.symbol,
    name: series.name,
    currency: series.currency,
    years: Number((closes.length / (key.startsWith("cg:") ? 365 : 252)).toFixed(1)),
    months,
    amount,
    windows: results.length,
    worst: amount * (1 + sorted[0]),
    p10: amount * (1 + percentile(sorted, 0.1)),
    median: amount * (1 + percentile(sorted, 0.5)),
    p90: amount * (1 + percentile(sorted, 0.9)),
    best: amount * (1 + sorted[sorted.length - 1]),
    lossShare: results.filter((value) => value < 0).length / results.length,
    note: "This is what happened in the past over the history available. It is not a forecast, and the future can be better or worse.",
  };
}
