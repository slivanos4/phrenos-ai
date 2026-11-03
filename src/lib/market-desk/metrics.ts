import type { AssetMetrics, AssetType, PriceSeries, RiskLabel } from "@/lib/market-desk/types";

/** How risky each kind of asset is before looking at its own price behaviour. */
const TYPE_BASE: Record<AssetType, number> = {
  fx: 10,
  bond: 12,
  etf: 20,
  commodity: 30,
  stock: 35,
  crypto: 60,
};

const TYPE_NOTE: Record<AssetType, string> = {
  fx: "Currencies move slowly day to day, but rate decisions can move them fast.",
  bond: "Bonds are usually steadier, but fall when interest rates rise.",
  etf: "A fund spreads risk across many holdings.",
  commodity: "Commodities swing with supply, demand and the dollar.",
  stock: "A single company's shares carry company-specific risk.",
  crypto: "Crypto has no earnings or central bank behind it and can fall very fast.",
};

function pct(change: number): string {
  return `${Math.abs(change * 100).toFixed(0)}%`;
}

function periodsPerYear(type: AssetType): number {
  return type === "crypto" ? 365 : 252;
}

function logReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    returns.push(Math.log(closes[index] / closes[index - 1]));
  }
  return returns;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function annualisedVol(closes: number[], window: number, type: AssetType): number | null {
  if (closes.length < window + 1) return null;
  return stdev(logReturns(closes.slice(-(window + 1)))) * Math.sqrt(periodsPerYear(type));
}

function sma(closes: number[], window: number): number | null {
  if (closes.length < window) return null;
  const slice = closes.slice(-window);
  return slice.reduce((sum, value) => sum + value, 0) / window;
}

function changeOver(closes: number[], days: number): number | null {
  if (closes.length <= days) return null;
  const then = closes[closes.length - 1 - days];
  return then > 0 ? closes[closes.length - 1] / then - 1 : null;
}

function worstDrawdown(closes: number[]): number {
  let peak = closes[0];
  let worst = 0;
  for (const close of closes) {
    peak = Math.max(peak, close);
    worst = Math.min(worst, close / peak - 1);
  }
  return worst;
}

export function riskLabelFor(score: number): RiskLabel {
  if (score < 20) return "Very low";
  if (score < 35) return "Low";
  if (score < 50) return "Moderate";
  if (score < 70) return "High";
  return "Very high";
}

/**
 * The risk scale, 0 (safest) to 100 (most volatile). It blends how much the price has been
 * swinging, how far it has fallen at its worst, what kind of asset it is, and whether it is
 * in a downtrend. Every point of the score comes with a plain-language reason.
 */
export function computeMetrics(series: PriceSeries): AssetMetrics {
  const { closes, type } = series;
  const price = closes[closes.length - 1];
  const vol30 = annualisedVol(closes, 30, type);
  const vol90 = annualisedVol(closes, 90, type);
  const drawdown = worstDrawdown(closes);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  const volScore = Math.min(100, (vol30 ?? vol90 ?? 0.2) * 160);
  const drawdownScore = Math.min(100, Math.abs(drawdown) * 180);
  let trendPenalty = 0;
  if (sma200 && price < sma200) trendPenalty += 10;
  if (sma50 && price < sma50) trendPenalty += 5;

  const score = Math.round(
    Math.min(100, Math.max(0, volScore * 0.4 + drawdownScore * 0.25 + TYPE_BASE[type] * 0.25 + trendPenalty)),
  );

  const reasons: string[] = [];
  if (vol30 !== null) {
    const band = vol30 > 0.6 ? "very high" : vol30 > 0.35 ? "high" : vol30 > 0.2 ? "moderate" : "low";
    reasons.push(`Price swings: ${(vol30 * 100).toFixed(0)}% annualised over the last 30 days (${band}).`);
  }
  if (drawdown < -0.05) {
    reasons.push(`It fell ${pct(drawdown)} from its high at its worst point in the last year.`);
  }
  if (sma200 && price < sma200) {
    reasons.push("It is trading below its 200-day average, which is a downtrend.");
  } else if (sma200) {
    reasons.push("It is trading above its 200-day average, which is an uptrend.");
  }
  if (vol30 !== null && vol90 !== null && vol30 > vol90 * 1.5 && vol30 > 0.25) {
    reasons.push("Recent swings are much bigger than usual, so conditions are getting rougher.");
  }
  reasons.push(TYPE_NOTE[type]);

  return {
    price,
    change_1d: changeOver(closes, 1),
    change_7d: changeOver(closes, 7),
    change_30d: changeOver(closes, 30),
    change_90d: changeOver(closes, 90),
    vol_30d: vol30,
    vol_90d: vol90,
    drawdown_1y: drawdown,
    sma50,
    sma200,
    risk_score: score,
    risk_label: riskLabelFor(score),
    risk_reasons: reasons,
  };
}
