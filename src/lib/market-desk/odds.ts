/**
 * What happened after similar episodes in this asset's own past. It counts real past cases and reports how they ended. It is a record,
 * not a forecast: the future can differ, and a small number of cases means little.
 */
export type Odds = {
  /** Plain description of what counts as "similar". */
  condition: string | null;
  /** How many separate past episodes matched. */
  episodes: number;
  horizon: number;
  share_up: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
  /** The same figures across every day in the history, for comparison. */
  base_share_up: number | null;
  base_median: number | null;
  years: number;
  reliable: boolean;
};

const pctText = (value: number) => `${Math.abs(value * 100).toFixed(0)}%`;

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

function summarise(values: number[]) {
  if (values.length === 0) return { share_up: null, median: null, p10: null, p90: null };
  const sorted = [...values].sort((a, b) => a - b);
  return { share_up: values.filter((value) => value > 0).length / values.length, median: percentile(sorted, 0.5), p10: percentile(sorted, 0.1), p90: percentile(sorted, 0.9) };
}

export function historicalOdds(closes: number[], perYear: number, horizon = 20): Odds {
  const n = closes.length;
  const empty: Odds = { condition: null, episodes: 0, horizon, share_up: null, median: null, p10: null, p90: null, base_share_up: null, base_median: null, years: Number((n / perYear).toFixed(1)), reliable: false };
  if (n < 60 + horizon) return empty;

  const change = (index: number, back: number) => (index - back >= 0 ? closes[index] / closes[index - back] - 1 : null);
  const forward = (index: number) => (index + horizon < n ? closes[index + horizon] / closes[index] - 1 : null);

  const base: number[] = [];
  for (let i = 0; i + horizon < n; i += 1) base.push(forward(i) as number);
  const baseStats = summarise(base);

  const cur7 = change(n - 1, 7);
  const cur30 = change(n - 1, 30);
  let test: ((index: number) => boolean) | null = null;
  let condition: string | null = null;
  if (cur7 !== null && cur7 <= -0.08) {
    const bar = cur7 * 0.7;
    test = (i) => (change(i, 7) ?? 0) <= bar;
    condition = `weeks where it fell ${pctText(bar)} or more in 7 days`;
  } else if (cur30 !== null && cur30 <= -0.1) {
    const bar = cur30 * 0.7;
    test = (i) => (change(i, 30) ?? 0) <= bar;
    condition = `months where it fell ${pctText(bar)} or more in 30 days`;
  } else if (cur30 !== null && cur30 >= 0.1) {
    const bar = cur30 * 0.7;
    test = (i) => (change(i, 30) ?? 0) >= bar;
    condition = `months where it rose ${pctText(bar)} or more in 30 days`;
  }

  let outcomes: number[] = [];
  if (test) {
    // One case per episode: after a match, skip a week so a single slump is not counted many times.
    for (let i = 30; i + horizon < n - 1; i += 1) {
      if (!test(i)) continue;
      outcomes.push(forward(i) as number);
      i += 7;
    }
  }
  outcomes = outcomes.filter((value) => Number.isFinite(value));
  const stats = summarise(outcomes);
  return {
    condition,
    episodes: outcomes.length,
    horizon,
    ...stats,
    base_share_up: baseStats.share_up,
    base_median: baseStats.median,
    years: Number((n / perYear).toFixed(1)),
    reliable: outcomes.length >= 8,
  };
}
