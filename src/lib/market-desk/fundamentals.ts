/**
 * What the business itself is doing, from its reported results: growth, margins, whether it has beaten expectations, valuation, and what
 * analysts as a group think. It is shown beside the price-based score, not folded into it, because price and business can disagree.
 * The analyst view is other people's opinion, reported as data.
 */
export type EarningsQuarter = { quarter: string; actual: number | null; estimate: number | null; surprise: number | null };

export type Fundamentals = {
  revenue_growth: number | null;
  earnings_growth: number | null;
  profit_margin: number | null;
  operating_margin: number | null;
  return_on_equity: number | null;
  debt_to_equity: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  earnings: EarningsQuarter[];
  beats: number;
  next_earnings: string | null;
  analysts: { count: number; positive: number; neutral: number; negative: number; target_vs_price: number | null } | null;
};

type Raw = { raw?: number; fmt?: string } | number | null | undefined;
const num = (value: Raw): number | null => {
  const v = typeof value === "object" && value !== null ? value.raw : value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

type Summary = {
  financialData?: Record<string, Raw | string>;
  summaryDetail?: Record<string, Raw>;
  earningsHistory?: { history?: { quarter?: { fmt?: string }; epsActual?: Raw; epsEstimate?: Raw; surprisePercent?: Raw }[] };
  calendarEvents?: { earnings?: { earningsDate?: { fmt?: string }[] } };
  recommendationTrend?: { trend?: { period?: string; strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }[] };
};

export function parseFundamentals(result: Summary): Fundamentals | null {
  const fd = result.financialData ?? {};
  const history = (result.earningsHistory?.history ?? []).map((row) => ({
    quarter: row.quarter?.fmt ?? "",
    actual: num(row.epsActual),
    estimate: num(row.epsEstimate),
    surprise: num(row.surprisePercent),
  })).filter((row) => row.quarter);
  const revenueGrowth = num(fd.revenueGrowth as Raw);
  if (revenueGrowth === null && history.length === 0 && num(fd.profitMargins as Raw) === null) return null;

  const trend = result.recommendationTrend?.trend?.find((row) => row.period === "0m") ?? result.recommendationTrend?.trend?.[0];
  const count = trend ? (trend.strongBuy ?? 0) + (trend.buy ?? 0) + (trend.hold ?? 0) + (trend.sell ?? 0) + (trend.strongSell ?? 0) : 0;
  const target = num(fd.targetMeanPrice as Raw);
  const current = num(fd.currentPrice as Raw);
  // Only a date still ahead counts as "next"; the feed sometimes keeps showing the one that has just passed.
  const today = new Date().toISOString().slice(0, 10);
  const nextDate = (result.calendarEvents?.earnings?.earningsDate ?? []).map((row) => row.fmt ?? "").find((date) => date >= today) ?? null;

  return {
    revenue_growth: revenueGrowth,
    earnings_growth: num(fd.earningsGrowth as Raw),
    profit_margin: num(fd.profitMargins as Raw),
    operating_margin: num(fd.operatingMargins as Raw),
    return_on_equity: num(fd.returnOnEquity as Raw),
    debt_to_equity: num(fd.debtToEquity as Raw),
    trailing_pe: num(result.summaryDetail?.trailingPE),
    forward_pe: num(result.summaryDetail?.forwardPE),
    earnings: history.slice(-4),
    beats: history.slice(-4).filter((row) => (row.surprise ?? 0) > 0).length,
    next_earnings: nextDate,
    analysts: trend && count >= 3
      ? {
          count,
          positive: (trend.strongBuy ?? 0) + (trend.buy ?? 0),
          neutral: trend.hold ?? 0,
          negative: (trend.sell ?? 0) + (trend.strongSell ?? 0),
          target_vs_price: target && current ? target / current - 1 : null,
        }
      : null,
  };
}

export type CheckLine = { label: string; verdict: string; tone: "good" | "neutral" | "warn" | "bad"; detail: string };

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

/** Plain-language verdicts on each area, so the numbers are readable at a glance. */
export function companyCheck(f: Fundamentals): CheckLine[] {
  const lines: CheckLine[] = [];
  if (f.revenue_growth !== null) {
    const g = f.revenue_growth;
    lines.push({ label: "Sales growth", verdict: g > 0.2 ? "Growing fast" : g > 0.05 ? "Growing" : g > -0.02 ? "Flat" : "Shrinking", tone: g > 0.05 ? "good" : g > -0.02 ? "neutral" : "bad", detail: `Revenue ${g >= 0 ? "up" : "down"} ${pct(Math.abs(g))} on a year earlier.` });
  }
  if (f.profit_margin !== null) {
    const m = f.profit_margin;
    lines.push({ label: "Profitability", verdict: m > 0.2 ? "Very profitable" : m > 0.08 ? "Profitable" : m > 0 ? "Thin profit" : "Losing money", tone: m > 0.08 ? "good" : m > 0 ? "neutral" : "bad", detail: `${pct(m)} of sales is kept as profit.` });
  }
  if (f.earnings.length >= 2) {
    lines.push({ label: "Results vs expectations", verdict: f.beats === f.earnings.length ? "Beat every time" : f.beats >= f.earnings.length - 1 ? "Mostly beat" : f.beats >= 2 ? "Mixed" : "Often missed", tone: f.beats >= f.earnings.length - 1 ? "good" : f.beats >= 2 ? "neutral" : "bad", detail: `Beat analysts' profit estimates in ${f.beats} of the last ${f.earnings.length} quarters.` });
  }
  if (f.trailing_pe !== null && f.trailing_pe > 0) {
    const cheaperAhead = f.forward_pe !== null && f.forward_pe > 0 && f.forward_pe < f.trailing_pe;
    lines.push({ label: "Price against earnings", verdict: f.trailing_pe < 15 ? "Low" : f.trailing_pe < 30 ? "Moderate" : "High", tone: f.trailing_pe < 15 ? "good" : f.trailing_pe < 30 ? "neutral" : "warn", detail: `Price is ${f.trailing_pe.toFixed(1)} times the last year's earnings${f.forward_pe ? `, and ${f.forward_pe.toFixed(1)} times what analysts expect next year${cheaperAhead ? ", so earnings are expected to keep growing" : ""}` : ""}. A low figure can also mean investors doubt the earnings will last.` });
  }
  if (f.debt_to_equity !== null) {
    const d = f.debt_to_equity;
    lines.push({ label: "Debt", verdict: d < 50 ? "Low" : d < 120 ? "Moderate" : "High", tone: d < 50 ? "good" : d < 120 ? "neutral" : "warn", detail: `Debt is ${d.toFixed(0)}% of shareholders' equity.` });
  }
  return lines;
}

/** Where price and business point in different directions, which is when the headline needs the most attention. */
export function priceVsBusiness(f: Fundamentals, change30: number | null): string | null {
  if (change30 === null) return null;
  const strong = (f.revenue_growth ?? 0) > 0.1 && f.beats >= Math.max(2, f.earnings.length - 1) && (f.profit_margin ?? 0) > 0;
  const weak = (f.revenue_growth ?? 0) < 0 || (f.profit_margin ?? 0) < 0 || f.beats <= 1;
  if (change30 <= -0.2 && strong) return "The price has fallen far faster than the business has changed: reported results are strong while the share price is sharply down. That usually means the fall is driven by news or worry about something else, not by current results. It does not show that the fall is over, and a problem in the accounts or the outlook could still change the business picture.";
  if (change30 >= 0.2 && weak) return "The price has risen sharply while reported results are weak or shrinking. Rises that run ahead of the business can reverse if results do not catch up.";
  return null;
}

/** The same facts as short pre-formatted strings for the AI prompt. Ratings are given as counts, never as buy or sell words. */
export function fundamentalsForPrompt(f: Fundamentals): Record<string, unknown> {
  const p = (v: number | null) => (v === null ? null : `${(v * 100).toFixed(1)}%`);
  return {
    revenue_growth_year_on_year: p(f.revenue_growth),
    profit_growth_year_on_year: p(f.earnings_growth),
    profit_margin: p(f.profit_margin),
    price_to_earnings_last_year: f.trailing_pe === null ? null : f.trailing_pe.toFixed(1),
    price_to_earnings_expected_next_year: f.forward_pe === null ? null : f.forward_pe.toFixed(1),
    quarters_beating_profit_estimates: `${f.beats} of ${f.earnings.length}`,
    latest_quarter_profit_surprise: p(f.earnings[f.earnings.length - 1]?.surprise ?? null),
    next_results_date: f.next_earnings,
    analysts: f.analysts ? { count: f.analysts.count, positive_ratings: f.analysts.positive, neutral_ratings: f.analysts.neutral, negative_ratings: f.analysts.negative, average_target_vs_current_price: p(f.analysts.target_vs_price) } : null,
  };
}
