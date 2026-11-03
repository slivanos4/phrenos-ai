import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { computeMetrics } from "@/lib/market-desk/metrics";
import { fetchSeries, fxRate } from "@/lib/market-desk/providers";
import type { AlertRow, AssetRow, AssetType, HoldingRow, PriceSeries } from "@/lib/market-desk/types";

export const T = {
  assets: "phrenos_market_assets",
  holdings: "phrenos_market_holdings",
  watchlist: "phrenos_market_watchlist",
  alerts: "phrenos_market_alerts",
  settings: "phrenos_market_settings",
  briefs: "phrenos_market_briefs",
  events: "phrenos_market_events",
  signals: "phrenos_market_signals",
  launches: "phrenos_market_launches",
  rankings: "phrenos_market_rankings",
  push: "phrenos_push_subscriptions",
} as const;

function db() {
  return createServiceRoleClient();
}

function explain(message: string): Error {
  return new Error(
    /phrenos_market|relation .* does not exist/i.test(message)
      ? "The Market Desk tables are missing. Run supabase/migrations/008_market_desk.sql in Supabase."
      : message,
  );
}

const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

function toAsset(row: Record<string, unknown>): AssetRow {
  const numeric = (key: string) => num(row[key]);
  return {
    key: String(row.key),
    provider: String(row.provider),
    symbol: String(row.symbol),
    name: String(row.name ?? ""),
    asset_type: row.asset_type as AssetType,
    currency: String(row.currency ?? "USD"),
    price: numeric("price"),
    price_gbp: numeric("price_gbp"),
    price_eur: numeric("price_eur"),
    change_1d: numeric("change_1d"),
    change_7d: numeric("change_7d"),
    change_30d: numeric("change_30d"),
    change_90d: numeric("change_90d"),
    vol_30d: numeric("vol_30d"),
    vol_90d: numeric("vol_90d"),
    drawdown_1y: numeric("drawdown_1y"),
    sma50: numeric("sma50"),
    sma200: numeric("sma200"),
    risk_score: numeric("risk_score"),
    risk_label: (row.risk_label as AssetRow["risk_label"]) ?? null,
    risk_reasons: (row.risk_reasons as string[]) ?? [],
    prev_risk_score: numeric("prev_risk_score"),
    history: ((row.history as number[]) ?? []).map(Number),
    updated_at: String(row.updated_at),
  };
}

function toHolding(row: Record<string, unknown>): HoldingRow {
  return {
    ...(row as unknown as HoldingRow),
    quantity: Number(row.quantity),
    buy_price: Number(row.buy_price),
    high_water: num(row.high_water),
    sell_price: num(row.sell_price),
  };
}

/** Fetches fresh prices, recomputes the risk scale, and saves the result. */
export async function refreshAsset(key: string, series?: PriceSeries): Promise<{ asset: AssetRow; series: PriceSeries }> {
  const data = series ?? (await fetchSeries(key));
  const metrics = computeMetrics(data);

  let priceGbp = data.gbpPrice ?? null;
  let priceEur = data.eurPrice ?? null;
  try {
    if (priceGbp === null) priceGbp = metrics.price * (await fxRate(data.currency, "GBP"));
    if (priceEur === null) priceEur = metrics.price * (await fxRate(data.currency, "EUR"));
  } catch {
    // Prices still show in the asset's own currency if a rate is unavailable.
  }

  const { data: existing } = await db().from(T.assets).select("risk_score").eq("key", data.key).maybeSingle();
  const row = {
    key: data.key,
    provider: data.provider,
    symbol: data.symbol,
    name: data.name,
    asset_type: data.type,
    currency: data.currency,
    price: metrics.price,
    price_gbp: priceGbp,
    price_eur: priceEur,
    change_1d: metrics.change_1d,
    change_7d: metrics.change_7d,
    change_30d: metrics.change_30d,
    change_90d: metrics.change_90d,
    vol_30d: metrics.vol_30d,
    vol_90d: metrics.vol_90d,
    drawdown_1y: metrics.drawdown_1y,
    sma50: metrics.sma50,
    sma200: metrics.sma200,
    risk_score: metrics.risk_score,
    risk_label: metrics.risk_label,
    risk_reasons: metrics.risk_reasons,
    prev_risk_score: existing ? num(existing.risk_score) : null,
    history: data.closes.slice(-120).map((value) => Number(value.toPrecision(6))),
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await db().from(T.assets).upsert(row).select("*").single();
  if (error) throw explain(error.message);
  return { asset: toAsset(saved), series: data };
}

export async function getAssets(keys: string[]): Promise<Map<string, AssetRow>> {
  if (keys.length === 0) return new Map();
  const { data, error } = await db().from(T.assets).select("*").in("key", keys);
  if (error) throw explain(error.message);
  return new Map((data ?? []).map((row) => [String(row.key), toAsset(row)]));
}

export async function listHoldings(status?: "open" | "closed"): Promise<HoldingRow[]> {
  let query = db().from(T.holdings).select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw explain(error.message);
  return (data ?? []).map(toHolding);
}

/** Buy price expressed in the asset's own currency, so it can be compared with the live price. */
export async function buyPriceInAssetCurrency(holding: HoldingRow, assetCurrency: string): Promise<number> {
  if (holding.buy_currency.toUpperCase() === assetCurrency.toUpperCase()) return holding.buy_price;
  try {
    return holding.buy_price * (await fxRate(holding.buy_currency, assetCurrency));
  } catch {
    return holding.buy_price;
  }
}

export async function addHolding(input: {
  asset_key: string;
  quantity: number;
  buy_price: number;
  buy_currency?: string;
  buy_date?: string | null;
  notes?: string;
}): Promise<HoldingRow> {
  const { asset, series } = await refreshAsset(input.asset_key);
  const buyCurrency = (input.buy_currency || asset.currency).toUpperCase();
  const draft = {
    asset_key: asset.key,
    symbol: asset.symbol,
    name: asset.name,
    asset_type: asset.asset_type,
    quantity: input.quantity,
    buy_price: input.buy_price,
    buy_currency: buyCurrency,
    buy_date: input.buy_date || null,
    notes: input.notes ?? "",
    status: "open",
  };
  const buyNative = await buyPriceInAssetCurrency(
    { ...(draft as unknown as HoldingRow), buy_currency: buyCurrency },
    asset.currency,
  );
  const since = input.buy_date ?? "0000-00-00";
  const afterBuy = series.closes.filter((_, index) => series.dates[index] >= since);
  const highWater = Math.max(buyNative, ...(afterBuy.length ? afterBuy : [asset.price ?? 0]));
  const { data, error } = await db().from(T.holdings).insert({ ...draft, high_water: highWater }).select("*").single();
  if (error) throw explain(error.message);
  return toHolding(data);
}

export async function closeHolding(id: string, sellPrice: number | null): Promise<void> {
  const { error } = await db()
    .from(T.holdings)
    .update({ status: "closed", sell_price: sellPrice, sold_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw explain(error.message);
}

export async function deleteHolding(id: string): Promise<void> {
  const { error } = await db().from(T.holdings).delete().eq("id", id);
  if (error) throw explain(error.message);
}

export async function listWatchlist() {
  const { data, error } = await db().from(T.watchlist).select("*").order("added_at", { ascending: false });
  if (error) throw explain(error.message);
  return data ?? [];
}

export async function addToWatchlist(key: string): Promise<void> {
  const { asset } = await refreshAsset(key);
  const { error } = await db()
    .from(T.watchlist)
    .upsert({ asset_key: asset.key, symbol: asset.symbol, name: asset.name, asset_type: asset.asset_type });
  if (error) throw explain(error.message);
}

export async function removeFromWatchlist(key: string): Promise<void> {
  const { error } = await db().from(T.watchlist).delete().eq("asset_key", key);
  if (error) throw explain(error.message);
}

export async function listAlerts(limit = 50): Promise<AlertRow[]> {
  const { data, error } = await db()
    .from(T.alerts)
    .select("*")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw explain(error.message);
  return (data ?? []) as AlertRow[];
}

export async function dismissAlert(id: string): Promise<void> {
  const { error } = await db().from(T.alerts).update({ dismissed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw explain(error.message);
}

export type MarketSettings = { alert_email: string | null; thresholds: Record<string, number> };

export async function getSettings(): Promise<MarketSettings> {
  const { data, error } = await db().from(T.settings).select("alert_email, thresholds").eq("id", 1).maybeSingle();
  if (error) throw explain(error.message);
  return {
    alert_email: (data?.alert_email as string | null) ?? null,
    thresholds: (data?.thresholds as Record<string, number>) ?? {},
  };
}

export async function saveSettings(settings: Partial<MarketSettings>): Promise<MarketSettings> {
  const current = await getSettings();
  const next = {
    id: 1,
    alert_email: settings.alert_email !== undefined ? settings.alert_email : current.alert_email,
    thresholds: settings.thresholds ?? current.thresholds,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from(T.settings).upsert(next);
  if (error) throw explain(error.message);
  return { alert_email: next.alert_email, thresholds: next.thresholds };
}
