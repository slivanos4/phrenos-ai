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

export type Dca = {
  symbol: string;
  name: string;
  currency: string;
  frequency: "weekly" | "monthly";
  amount: number;
  months: number;
  years: number;
  windows: number;
  /** What happened over the most recent stretch of this length. */
  recent: { buys: number; invested: number; value: number; gain: number; average_cost: number; lump_value: number };
  /** The spread of results, as a gain or loss on the money paid in, over every possible start date. */
  worst: number;
  p10: number;
  median: number;
  p90: number;
  best: number;
  loss_share: number;
  /** How many of the starts did better with regular buying than with everything paid in on day one. */
  beat_lump_share: number;
  note: string;
};

/**
 * Pays in a fixed amount every week or month and looks back over every possible start date, comparing with putting the same total in
 * on day one. Free crypto history is only one year, so crypto answers cover a shorter span than shares do.
 */
export async function dcaWhatIf(key: string, amount: number, months: number, frequency: "weekly" | "monthly"): Promise<Dca> {
  const series = key.startsWith("yahoo:") ? await yahooSeries(key.slice(6), "5y") : await fetchSeries(key);
  const crypto = key.startsWith("cg:");
  const perMonth = crypto ? 30 : 21;
  const span = Math.max(2, Math.round(months * perMonth));
  const step = frequency === "weekly" ? (crypto ? 7 : 5) : perMonth;
  const closes = series.closes;
  if (closes.length <= span + 5) throw new Error("Not enough price history for that period. Try a shorter one.");

  const run = (start: number) => {
    let units = 0;
    let buys = 0;
    for (let index = start; index < start + span; index += step) {
      units += amount / closes[index];
      buys += 1;
    }
    const invested = buys * amount;
    const end = closes[start + span];
    const value = units * end;
    return { buys, invested, value, units, lump: (invested / closes[start]) * end };
  };

  const gains: number[] = [];
  let beat = 0;
  for (let start = 0; start + span < closes.length; start += 1) {
    const result = run(start);
    gains.push(result.value / result.invested - 1);
    if (result.value > result.lump) beat += 1;
  }
  const sorted = [...gains].sort((a, b) => a - b);
  const recentStart = closes.length - 1 - span;
  const recent = run(recentStart);
  return {
    symbol: series.symbol,
    name: series.name,
    currency: series.currency,
    frequency,
    amount,
    months,
    years: Number((closes.length / (crypto ? 365 : 252)).toFixed(1)),
    windows: gains.length,
    recent: { buys: recent.buys, invested: recent.invested, value: recent.value, gain: recent.value / recent.invested - 1, average_cost: recent.invested / recent.units, lump_value: recent.lump },
    worst: sorted[0],
    p10: percentile(sorted, 0.1),
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    best: sorted[sorted.length - 1],
    loss_share: gains.filter((value) => value < 0).length / gains.length,
    beat_lump_share: beat / gains.length,
    note: "This is what happened in the past over the history available. It is not a forecast, and the future can be better or worse. Regular buying smooths the price you pay but does not remove the risk of loss.",
  };
}
