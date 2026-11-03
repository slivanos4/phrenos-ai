export type AssetType = "stock" | "etf" | "bond" | "crypto" | "fx" | "commodity";
export type RiskLabel = "Very low" | "Low" | "Moderate" | "High" | "Very high";

export const ASSET_TYPES: AssetType[] = ["stock", "etf", "bond", "crypto", "fx", "commodity"];

/** Daily closes for one asset, oldest first, in the currency the asset trades in. */
export type PriceSeries = {
  key: string;
  provider: "yahoo" | "cg";
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  closes: number[];
  /** yyyy-mm-dd for each close, same length as closes. */
  dates: string[];
  /** Only set by CoinGecko, which can quote straight into GBP and EUR. */
  gbpPrice?: number;
  eurPrice?: number;
};

export type AssetMetrics = {
  price: number;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  vol_30d: number | null;
  vol_90d: number | null;
  drawdown_1y: number | null;
  sma50: number | null;
  sma200: number | null;
  risk_score: number;
  risk_label: RiskLabel;
  risk_reasons: string[];
};

export type AssetRow = {
  key: string;
  provider: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  currency: string;
  price: number | null;
  price_gbp: number | null;
  price_eur: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  vol_30d: number | null;
  vol_90d: number | null;
  drawdown_1y: number | null;
  sma50: number | null;
  sma200: number | null;
  risk_score: number | null;
  risk_label: RiskLabel | null;
  risk_reasons: string[];
  prev_risk_score: number | null;
  history: number[];
  updated_at: string;
};

export type HoldingRow = {
  id: string;
  asset_key: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity: number;
  buy_price: number;
  buy_currency: string;
  buy_date: string | null;
  high_water: number | null;
  status: "open" | "closed";
  sell_price: number | null;
  sold_at: string | null;
  notes: string;
  created_at: string;
};

export type AlertRow = {
  id: string;
  holding_id: string | null;
  asset_key: string | null;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
  emailed_at: string | null;
  pushed_at: string | null;
  dismissed_at: string | null;
};

export type SearchHit = {
  key: string;
  provider: "yahoo" | "cg";
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
};
