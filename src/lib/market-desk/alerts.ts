import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import {
  buyPriceInAssetCurrency,
  getSettings,
  listHoldings,
  refreshAsset,
  T,
} from "@/lib/market-desk/store";
import { upcomingHighImpact } from "@/lib/market-desk/events";
import { alertEmail, sendEmail } from "@/lib/market-desk/notify";
import type { AlertRow, AssetType, HoldingRow, PriceSeries } from "@/lib/market-desk/types";

/** Default warning points (percent). Wider for riskier assets, because they swing more by nature. */
export const DEFAULT_THRESHOLDS: Record<string, number> = {
  drop_fx: 5,
  drop_bond: 6,
  drop_etf: 8,
  drop_commodity: 10,
  drop_stock: 12,
  drop_crypto: 22,
  day_fx: 2.5,
  day_bond: 2,
  day_etf: 4,
  day_commodity: 6,
  day_stock: 8,
  day_crypto: 14,
  concentration: 40,
};

type Draft = Pick<AlertRow, "kind" | "severity" | "title" | "message"> & {
  holding_id: string | null;
  asset_key: string | null;
  data: Record<string, unknown>;
};

const DEDUPE_DAYS = 3;

function smaAt(closes: number[], window: number, endIndex: number): number | null {
  if (endIndex + 1 < window) return null;
  const slice = closes.slice(endIndex + 1 - window, endIndex + 1);
  return slice.reduce((sum, value) => sum + value, 0) / window;
}

/** True if the price was above its average within the last few sessions and is below it now. */
function crossedBelow(closes: number[], window: number, sessions = 3): boolean {
  const last = closes.length - 1;
  const now = smaAt(closes, window, last);
  if (now === null || closes[last] >= now) return false;
  for (let back = 1; back <= sessions; back += 1) {
    const average = smaAt(closes, window, last - back);
    if (average !== null && closes[last - back] >= average) return true;
  }
  return false;
}

const pct = (value: number) => `${Math.abs(value * 100).toFixed(1)}%`;

export function evaluateHolding(
  holding: HoldingRow,
  series: PriceSeries,
  buyNative: number,
  highWater: number,
  prevRisk: number | null,
  riskScore: number,
  vol30: number | null,
  vol90: number | null,
  thresholds: Record<string, number>,
): Draft[] {
  const price = series.closes[series.closes.length - 1];
  const type: AssetType = holding.asset_type;
  const label = `${holding.name || holding.symbol} (${holding.symbol})`;
  const base = { holding_id: holding.id, asset_key: holding.asset_key };
  const drafts: Draft[] = [];

  const dropLimit = (thresholds[`drop_${type}`] ?? DEFAULT_THRESHOLDS[`drop_${type}`]) / 100;
  const fromHigh = price / highWater - 1;
  if (fromHigh <= -dropLimit) {
    drafts.push({
      ...base,
      kind: "drop_from_high",
      severity: fromHigh <= -dropLimit * 1.5 ? "critical" : "warning",
      title: `${label} is down ${pct(fromHigh)} from its high since you bought`,
      message: `Your warning point for ${type} holdings is a ${(dropLimit * 100).toFixed(0)}% fall from the high. It is now ${pct(fromHigh)} below that high. Consider whether your reason for holding it still stands.`,
      data: { fromHigh, highWater, price },
    });
  }

  const sinceBuy = price / buyNative - 1;
  if (sinceBuy <= -dropLimit) {
    drafts.push({
      ...base,
      kind: "loss_from_buy",
      severity: sinceBuy <= -dropLimit * 1.5 ? "critical" : "warning",
      title: `${label} is ${pct(sinceBuy)} below what you paid`,
      message: `You bought at ${buyNative.toFixed(2)} ${series.currency} and it now trades at ${price.toFixed(2)} ${series.currency}.`,
      data: { sinceBuy, buyNative, price },
    });
  }

  if (crossedBelow(series.closes, 200)) {
    drafts.push({
      ...base,
      kind: "trend_break",
      severity: "warning",
      title: `${label} fell below its 200-day average`,
      message: "The price has just dropped under its long-term average after trading above it. That often marks the start of a downtrend, though it can reverse.",
      data: { window: 200 },
    });
  } else if (crossedBelow(series.closes, 50) && (smaAt(series.closes, 50, series.closes.length - 1) ?? 0) < (smaAt(series.closes, 200, series.closes.length - 1) ?? Infinity)) {
    drafts.push({
      ...base,
      kind: "trend_break",
      severity: "info",
      title: `${label} slipped under its 50-day average`,
      message: "Its short-term trend has turned down while the long-term trend is already weak.",
      data: { window: 50 },
    });
  }

  const dayLimit = (thresholds[`day_${type}`] ?? DEFAULT_THRESHOLDS[`day_${type}`]) / 100;
  const day = series.closes.length > 1 ? price / series.closes[series.closes.length - 2] - 1 : 0;
  if (day <= -dayLimit) {
    drafts.push({
      ...base,
      kind: "day_drop",
      severity: day <= -dayLimit * 1.5 ? "critical" : "warning",
      title: `${label} fell ${pct(day)} in one day`,
      message: "A drop this size in a single session is unusual for this kind of asset. Check the news for a cause.",
      data: { day },
    });
  }

  if (vol30 !== null && vol90 !== null && vol30 > vol90 * 1.6 && vol30 > 0.25) {
    drafts.push({
      ...base,
      kind: "volatility_spike",
      severity: "warning",
      title: `${label} is swinging much more than usual`,
      message: `Its recent price swings (${(vol30 * 100).toFixed(0)}% annualised) are well above its 3-month norm (${(vol90 * 100).toFixed(0)}%). Rough patches often come in clusters.`,
      data: { vol30, vol90 },
    });
  }

  if (prevRisk !== null && riskScore - prevRisk >= 15) {
    drafts.push({
      ...base,
      kind: "risk_jump",
      severity: "warning",
      title: `${label} became riskier`,
      message: `Its risk score rose from ${prevRisk} to ${riskScore} out of 100.`,
      data: { prevRisk, riskScore },
    });
  }

  return drafts;
}

export type CheckSummary = {
  holdings: number;
  refreshed: number;
  failed: string[];
  newAlerts: number;
  emailed: boolean;
};

/** The daily check: refreshes every open holding, applies the alert rules, stores and emails new warnings. */
export async function runHoldingsCheck(): Promise<CheckSummary> {
  const supabase = createServiceRoleClient();
  const [holdings, settings] = await Promise.all([listHoldings("open"), getSettings()]);
  const thresholds = { ...DEFAULT_THRESHOLDS, ...settings.thresholds };
  const summary: CheckSummary = { holdings: holdings.length, refreshed: 0, failed: [], newAlerts: 0, emailed: false };
  if (holdings.length === 0) return summary;

  const keys = [...new Set(holdings.map((holding) => holding.asset_key))];
  const loaded = new Map<string, Awaited<ReturnType<typeof refreshAsset>>>();
  for (const key of keys) {
    try {
      loaded.set(key, await refreshAsset(key));
      summary.refreshed += 1;
    } catch (error) {
      summary.failed.push(`${key}: ${error instanceof Error ? error.message : "failed"}`);
    }
    if (key.startsWith("cg:")) await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const drafts: Draft[] = [];
  let totalValue = 0;
  const values = new Map<string, number>();
  for (const holding of holdings) {
    const entry = loaded.get(holding.asset_key);
    if (!entry) continue;
    const { asset, series } = entry;
    const buyNative = await buyPriceInAssetCurrency(holding, series.currency);
    const since = holding.buy_date ?? "0000-00-00";
    const peak = Math.max(
      holding.high_water ?? 0,
      buyNative,
      ...series.closes.filter((_, index) => series.dates[index] >= since),
    );
    if (peak !== holding.high_water) {
      await supabase.from(T.holdings).update({ high_water: peak }).eq("id", holding.id);
    }
    drafts.push(
      ...evaluateHolding(
        holding,
        series,
        buyNative,
        peak,
        asset.prev_risk_score,
        asset.risk_score ?? 0,
        asset.vol_30d,
        asset.vol_90d,
        thresholds,
      ),
    );
    const value = holding.quantity * (asset.price_gbp ?? 0);
    values.set(holding.id, value);
    totalValue += value;
  }

  if (totalValue > 0) {
    for (const holding of holdings) {
      const share = (values.get(holding.id) ?? 0) / totalValue;
      if (share * 100 >= thresholds.concentration && holdings.length > 1) {
        drafts.push({
          holding_id: holding.id,
          asset_key: holding.asset_key,
          kind: "concentration",
          severity: "info",
          title: `${holding.name || holding.symbol} is ${(share * 100).toFixed(0)}% of your portfolio`,
          message: `One holding makes up more than ${thresholds.concentration}% of what you hold. If it falls, your whole portfolio feels it.`,
          data: { share },
        });
      }
    }
  }

  // Big announcements due in the next day (rate decisions, inflation, jobs), once each.
  const upcoming = await upcomingHighImpact().catch(() => []);
  if (upcoming.length > 0) {
    const { data: seen } = await supabase.from(T.alerts).select("data").eq("kind", "event_risk").gte("created_at", new Date(Date.now() - 4 * 86400000).toISOString());
    const seenKeys = new Set((seen ?? []).map((row) => String((row.data as { eventKey?: string })?.eventKey)));
    for (const event of upcoming) {
      const eventKey = `${event.title}|${event.event_date}`;
      if (seenKeys.has(eventKey)) continue;
      const decision = /(rate|fomc|policy|inflation|cpi|payroll|employment|gdp)/i.test(String(event.title));
      drafts.push({
        holding_id: null,
        asset_key: null,
        kind: "event_risk",
        severity: decision ? "warning" : "info",
        title: `Coming up: ${event.title}`,
        message: `${event.summary ? `${event.summary}. ` : ""}Announcements like this can move currencies, bonds, stocks and crypto quickly, often in the minutes after the release. Prices can swing in both directions.`,
        data: { eventKey, when: event.event_date },
      });
    }
  }

  const since = new Date(Date.now() - DEDUPE_DAYS * 86400000).toISOString();
  const { data: recent } = await supabase.from(T.alerts).select("holding_id, kind, severity").gte("created_at", since);
  const rank: Record<string, number> = { info: 0, warning: 1, critical: 2 };
  const fresh = drafts.filter(
    (draft) =>
      draft.kind === "event_risk" ||
      !(recent ?? []).some(
        (old) =>
          old.holding_id === draft.holding_id &&
          old.kind === draft.kind &&
          rank[String(old.severity)] >= rank[draft.severity],
      ),
  );

  if (fresh.length > 0) {
    const { data: inserted, error } = await supabase.from(T.alerts).insert(fresh).select("*");
    if (error) throw new Error(error.message);
    summary.newAlerts = inserted?.length ?? 0;
    const important = ((inserted ?? []) as AlertRow[]).filter((alert) => alert.severity !== "info");
    if (important.length > 0 && settings.alert_email) {
      const mail = alertEmail(important);
      summary.emailed = await sendEmail(settings.alert_email, mail.subject, mail.html);
      if (summary.emailed) {
        await supabase
          .from(T.alerts)
          .update({ emailed_at: new Date().toISOString() })
          .in("id", important.map((alert) => alert.id));
      }
    }
    const { pushAlerts } = await import("@/lib/market-desk/push");
    await pushAlerts(important);
  }

  return summary;
}
