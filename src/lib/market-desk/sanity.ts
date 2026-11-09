/**
 * Guards against impossible numbers reaching the screen. A price feed sometimes returns a fall of more than 100 percent,
 * a negative market value or a price of zero. Those are broken readings, not news, so they are blanked or the asset is left out.
 */
export type Checkable = {
  symbol: string;
  price_gbp: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  market_cap_gbp: number | null;
  volume_gbp: number | null;
  drawdown_1y: number | null;
  year_high: number | null;
  year_low: number | null;
  history: number[];
};

export type Quality = { dropped: string[]; fixed: number };

const usable = (value: number | null) => value !== null && Number.isFinite(value);

/** Fixes what can be fixed in place and returns false when the asset has no believable price at all. */
export function cleanAsset(row: Checkable): { keep: boolean; fixes: string[] } {
  const fixes: string[] = [];
  if (!usable(row.price_gbp) || (row.price_gbp as number) <= 0) return { keep: false, fixes: ["no usable price"] };

  for (const field of ["change_1d", "change_7d", "change_30d", "change_90d"] as const) {
    const value = row[field];
    if (value === null) continue;
    // A fall of more than 100 percent cannot happen, and a rise past 10,000 percent in a few weeks is almost always a bad tick.
    if (!Number.isFinite(value) || value < -1 || value > 100) {
      row[field] = null;
      fixes.push(`${field} was ${value}`);
    }
  }
  for (const field of ["market_cap_gbp", "volume_gbp"] as const) {
    const value = row[field];
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      row[field] = null;
      fixes.push(`${field} was ${value}`);
    }
  }
  if (row.drawdown_1y !== null && (!Number.isFinite(row.drawdown_1y) || row.drawdown_1y < -1 || row.drawdown_1y > 0.0001)) {
    fixes.push(`drawdown_1y was ${row.drawdown_1y}`);
    row.drawdown_1y = null;
  }
  if (usable(row.year_high) && usable(row.year_low) && (row.year_low as number) > (row.year_high as number)) {
    row.year_high = null;
    row.year_low = null;
    fixes.push("year range was reversed");
  }
  const cleanHistory = row.history.filter((value) => Number.isFinite(value) && value > 0);
  if (cleanHistory.length !== row.history.length) {
    row.history = cleanHistory;
    fixes.push("history had bad points");
  }
  return { keep: true, fixes };
}

export function cleanAll<T extends Checkable>(rows: T[]): { kept: T[]; quality: Quality } {
  const quality: Quality = { dropped: [], fixed: 0 };
  const kept: T[] = [];
  for (const row of rows) {
    const { keep, fixes } = cleanAsset(row);
    if (!keep) {
      quality.dropped.push(row.symbol);
      continue;
    }
    if (fixes.length > 0) quality.fixed += 1;
    kept.push(row);
  }
  return { kept, quality };
}
