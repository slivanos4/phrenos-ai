import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { DEFAULT_THRESHOLDS } from "@/lib/market-desk/alerts";
import { buildFacts, type AssetFacts } from "@/lib/market-desk/facts";
import { fetchSeries } from "@/lib/market-desk/providers";
import { rankingFor, type RankingRow } from "@/lib/market-desk/rankings";
import { buyPriceInAssetCurrency, getSettings, listHoldings, refreshAsset, T } from "@/lib/market-desk/store";
import type { AlertRow, AssetRow, HoldingRow } from "@/lib/market-desk/types";

export type NewsItem = { title: string; publisher: string; link: string; published: string | null };

export type Detail = {
  asset: AssetRow;
  chart: { dates: string[]; closes: number[] };
  lines: { label: string; value: number; tone: "buy" | "high" | "warn" | "avg" }[];
  alert: AlertRow | null;
  rule: string | null;
  holding: (HoldingRow & { buy_native: number }) | null;
  timeline: { date: string; text: string }[];
  news: NewsItem[];
  signals: { id: string; signal_type: string; direction: string; summary: string; source_url: string | null; observed_at: string }[];
  announcements: { title: string; event_date: string | null; source_url: string; impact: string }[];
  links: { label: string; url: string }[];
  ranking: RankingRow | null;
  facts: AssetFacts | null;
};

const RULES: Record<string, string> = {
  drop_from_high: "Warns when a holding falls by your set percentage from the highest price it reached since you bought it.",
  loss_from_buy: "Warns when a holding is worth less than you paid by more than your set percentage.",
  trend_break: "Warns when the price drops below its 200-day (or, if the long-term trend is already weak, 50-day) average after being above it within the last 3 sessions.",
  day_drop: "Warns when a single day's fall is bigger than your set one-day limit for that kind of asset.",
  volatility_spike: "Warns when the last 30 days' price swings are more than 1.6 times the 90-day norm, and large in themselves.",
  risk_jump: "Warns when the 0 to 100 risk score rises by 15 points or more since the last check.",
  concentration: "Warns when one holding makes up more than your set share of everything you hold.",
  data_stale: "Warns when the price feed could not be reached, so the other rules cannot be checked.",
  event_risk: "Tells you about big announcements due within a day, because prices often move sharply when they land.",
};

export async function fetchNews(asset: AssetRow): Promise<NewsItem[]> {
  const query = asset.provider === "cg" ? asset.name : asset.symbol;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=8`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)" }, signal: AbortSignal.timeout(15000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { news?: { title: string; publisher?: string; link: string; providerPublishTime?: number }[] };
    return (body.news ?? []).map((item) => ({
      title: item.title,
      publisher: item.publisher ?? "",
      link: item.link,
      published: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null,
    }));
  } catch {
    return [];
  }
}

function externalLinks(asset: AssetRow) {
  if (asset.provider === "cg") {
    return [
      { label: "CoinGecko page", url: `https://www.coingecko.com/en/coins/${asset.key.slice(3)}` },
      { label: "TradingView chart", url: `https://www.tradingview.com/symbols/${asset.symbol}USD/` },
    ];
  }
  return [
    { label: "Yahoo Finance page", url: `https://finance.yahoo.com/quote/${encodeURIComponent(asset.symbol)}/` },
    { label: "Yahoo Finance news", url: `https://finance.yahoo.com/quote/${encodeURIComponent(asset.symbol)}/news/` },
    { label: "Google Finance", url: `https://www.google.com/finance/?q=${encodeURIComponent(asset.symbol)}` },
  ];
}

const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Everything needed to see why an asset or alert was flagged, with the underlying prices and links to check them. */
export async function buildDetail(key: string, alertId?: string | null): Promise<Detail> {
  const supabase = createServiceRoleClient();
  const [series, settings, holdings] = await Promise.all([fetchSeries(key), getSettings(), listHoldings("open")]);
  const { asset } = await refreshAsset(key, series);

  const holdingRow = holdings.find((holding) => holding.asset_key === key) ?? null;
  const buyNative = holdingRow ? await buyPriceInAssetCurrency(holdingRow, asset.currency) : null;

  let alert: AlertRow | null = null;
  if (alertId) {
    const { data } = await supabase.from(T.alerts).select("*").eq("id", alertId).maybeSingle();
    alert = (data as AlertRow | null) ?? null;
  }

  const closes = series.closes;
  const dates = series.dates;
  const lines: Detail["lines"] = [];
  const timeline: Detail["timeline"] = [];
  const thresholds = { ...DEFAULT_THRESHOLDS, ...settings.thresholds };

  if (holdingRow && buyNative) {
    lines.push({ label: `You paid ${buyNative.toFixed(2)}`, value: buyNative, tone: "buy" });
    const since = holdingRow.buy_date ?? "0000-00-00";
    let peak = buyNative;
    let peakDate = holdingRow.buy_date ?? dates[0];
    closes.forEach((close, index) => {
      if (dates[index] >= since && close > peak) {
        peak = close;
        peakDate = dates[index];
      }
    });
    const highWater = Math.max(peak, holdingRow.high_water ?? 0);
    lines.push({ label: `High since you bought: ${highWater.toFixed(2)}`, value: highWater, tone: "high" });
    const limit = (thresholds[`drop_${holdingRow.asset_type}`] ?? 10) / 100;
    lines.push({ label: `Warning point (${(limit * 100).toFixed(0)}% below the high): ${(highWater * (1 - limit)).toFixed(2)}`, value: highWater * (1 - limit), tone: "warn" });
    timeline.push({ date: holdingRow.buy_date ?? dates[0], text: `You bought at ${buyNative.toFixed(2)} ${asset.currency}.` });
    if (peak > buyNative) timeline.push({ date: peakDate, text: `The price peaked at ${peak.toFixed(2)} ${asset.currency}.` });
  }
  if (asset.sma200) lines.push({ label: `200-day average: ${asset.sma200.toFixed(2)}`, value: asset.sma200, tone: "avg" });

  // The biggest single-day moves in the last month, since sudden drops are what usually set warnings off.
  const recent = closes.map((close, index) => ({ index, move: index > 0 ? close / closes[index - 1] - 1 : 0 })).slice(-30);
  for (const item of [...recent].sort((a, b) => a.move - b.move).slice(0, 3)) {
    if (item.move < -0.02) timeline.push({ date: dates[item.index], text: `Fell ${(Math.abs(item.move) * 100).toFixed(1)}% in one day (to ${closes[item.index].toFixed(2)} ${asset.currency}).` });
  }
  timeline.push({ date: dates[dates.length - 1], text: `Latest price ${closes[closes.length - 1].toFixed(2)} ${asset.currency}.` });
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const [{ data: signals }, { data: events }] = await Promise.all([
    supabase.from(T.signals).select("id, signal_type, direction, summary, source_url, observed_at").eq("symbol", asset.symbol).order("observed_at", { ascending: false }).limit(8),
    supabase.from(T.events).select("title, event_date, source_url, impact").eq("impact", "high").gte("event_date", new Date(Date.now() - 7 * 86400000).toISOString()).order("event_date", { ascending: false }).limit(6),
  ]);

  const [newsItems, facts, ranking] = await Promise.all([
    fetchNews(asset),
    buildFacts(asset, series).catch((error) => { console.warn(`Facts for ${key} failed:`, error); return null; }),
    rankingFor(key),
  ]);

  return {
    asset,
    chart: { dates: dates.slice(-260), closes: closes.slice(-260) },
    lines,
    alert,
    rule: alert ? (RULES[alert.kind] ?? null) : null,
    holding: holdingRow && buyNative ? { ...holdingRow, buy_native: buyNative } : null,
    timeline: timeline.map((item) => ({ ...item, date: dateLabel(item.date) })),
    news: newsItems,
    signals: (signals ?? []) as Detail["signals"],
    announcements: (events ?? []) as Detail["announcements"],
    links: externalLinks(asset),
    ranking,
    facts,
  };
}
