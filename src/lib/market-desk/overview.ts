import { buyPriceInAssetCurrency, getAssets, getSettings, listAlerts, listHoldings, listWatchlist } from "@/lib/market-desk/store";
import { DEFAULT_THRESHOLDS } from "@/lib/market-desk/alerts";
import { fxRate } from "@/lib/market-desk/providers";
import type { AlertRow, AssetRow, AssetType, HoldingRow } from "@/lib/market-desk/types";

export type HoldingView = HoldingRow & {
  asset: AssetRow | null;
  value_gbp: number | null;
  value_eur: number | null;
  cost_gbp: number | null;
  pl_pct: number | null;
  pl_gbp: number | null;
  from_high_pct: number | null;
};

export type Overview = {
  holdings: HoldingView[];
  closed: HoldingView[];
  totals: {
    value_gbp: number;
    value_eur: number;
    cost_gbp: number;
    pl_gbp: number;
    pl_pct: number | null;
    risk_score: number | null;
    risk_label: string | null;
  };
  allocation: { type: AssetType; share: number }[];
  alerts: AlertRow[];
  watchlist: { asset_key: string; symbol: string; name: string; asset_type: AssetType; asset: AssetRow | null }[];
  settings: { alert_email: string | null; thresholds: Record<string, number> };
  defaults: Record<string, number>;
};

async function view(holding: HoldingRow, asset: AssetRow | null): Promise<HoldingView> {
  if (!asset || asset.price === null) {
    return { ...holding, asset, value_gbp: null, value_eur: null, cost_gbp: null, pl_pct: null, pl_gbp: null, from_high_pct: null };
  }
  const buyNative = await buyPriceInAssetCurrency(holding, asset.currency);
  const toGbp = asset.price_gbp !== null ? asset.price_gbp / asset.price : await fxRate(asset.currency, "GBP").catch(() => 1);
  const valueGbp = holding.quantity * (asset.price_gbp ?? asset.price * toGbp);
  const costGbp = holding.quantity * buyNative * toGbp;
  return {
    ...holding,
    asset,
    value_gbp: valueGbp,
    value_eur: asset.price_eur !== null ? holding.quantity * asset.price_eur : null,
    cost_gbp: costGbp,
    pl_pct: asset.price / buyNative - 1,
    pl_gbp: valueGbp - costGbp,
    from_high_pct: holding.high_water ? asset.price / holding.high_water - 1 : null,
  };
}

export async function buildOverview(): Promise<Overview> {
  const [all, alerts, watch, settings] = await Promise.all([listHoldings(), listAlerts(40), listWatchlist(), getSettings()]);
  const keys = [...new Set([...all.map((holding) => holding.asset_key), ...watch.map((item) => String(item.asset_key))])];
  const assets = await getAssets(keys);

  const views = await Promise.all(all.map((holding) => view(holding, assets.get(holding.asset_key) ?? null)));
  const open = views.filter((holding) => holding.status === "open");
  const closed = views.filter((holding) => holding.status === "closed");

  const value = open.reduce((sum, holding) => sum + (holding.value_gbp ?? 0), 0);
  const cost = open.reduce((sum, holding) => sum + (holding.cost_gbp ?? 0), 0);
  const eur = open.reduce((sum, holding) => sum + (holding.value_eur ?? 0), 0);

  const byType = new Map<AssetType, number>();
  let weightedRisk = 0;
  for (const holding of open) {
    byType.set(holding.asset_type, (byType.get(holding.asset_type) ?? 0) + (holding.value_gbp ?? 0));
    weightedRisk += (holding.asset?.risk_score ?? 0) * (holding.value_gbp ?? 0);
  }
  const riskScore = value > 0 ? Math.round(weightedRisk / value) : null;
  const { riskLabelFor } = await import("@/lib/market-desk/metrics");

  return {
    holdings: open,
    closed,
    totals: {
      value_gbp: value,
      value_eur: eur,
      cost_gbp: cost,
      pl_gbp: value - cost,
      pl_pct: cost > 0 ? value / cost - 1 : null,
      risk_score: riskScore,
      risk_label: riskScore === null ? null : riskLabelFor(riskScore),
    },
    allocation: [...byType.entries()]
      .map(([type, amount]) => ({ type, share: value > 0 ? amount / value : 0 }))
      .sort((a, b) => b.share - a.share),
    alerts,
    watchlist: watch.map((item) => ({
      asset_key: String(item.asset_key),
      symbol: String(item.symbol),
      name: String(item.name ?? ""),
      asset_type: item.asset_type as AssetType,
      asset: assets.get(String(item.asset_key)) ?? null,
    })),
    settings,
    defaults: DEFAULT_THRESHOLDS,
  };
}
