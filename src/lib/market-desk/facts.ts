import { getJson } from "@/lib/market-desk/providers";
import { getYahooSession } from "@/lib/market-desk/options";
import type { AssetRow, PriceSeries } from "@/lib/market-desk/types";

/**
 * Facts for the top of an asset page: what it is, how far it sits from its all-time high, supply, valuation figures, and a price history
 * table by day, week, month and year. Every field is optional because no single free source covers every kind of asset.
 */
export type HistoryRow = { label: string; open: number; high: number; low: number; close: number; change: number };
export type HistoryTable = { day: HistoryRow[]; week: HistoryRow[]; month: HistoryRow[]; year: HistoryRow[] };

export type AssetFacts = {
  about: string | null;
  about_source: { name: string; url: string } | null;
  categories: string[];
  sector: string | null;
  industry: string | null;
  website: string | null;
  rank: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  /** In the asset's own currency (pounds for crypto). */
  ath: { price: number; date: string; below_by: number; days_since: number; scope: "all-time" | "10-year" } | null;
  atl: { price: number; date: string; above_by: number } | null;
  pe: number | null;
  dividend_yield: number | null;
  beta: number | null;
  up_days_30: number;
  down_days_30: number;
  history: HistoryTable;
};

const UA = "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)";
const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const raw = (value: unknown): number | null => finite((value as { raw?: number } | null | undefined)?.raw);

function plainText(html: string, max = 900): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(". "), 200) + 1)}`.trim();
}

const daysBetween = (from: string) => Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 86_400_000));

/** Groups daily closes into periods. Open is the previous period's close, so the change joins up from one row to the next. */
export function periodRows(dates: string[], closes: number[], bucket: (date: string) => string, keep: number, label: (key: string) => string): HistoryRow[] {
  const groups: { key: string; closes: number[] }[] = [];
  dates.forEach((date, index) => {
    const key = bucket(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.closes.push(closes[index]);
    else groups.push({ key, closes: [closes[index]] });
  });
  const rows = groups.map((group, index) => {
    const open = index > 0 ? groups[index - 1].closes[groups[index - 1].closes.length - 1] : group.closes[0];
    const close = group.closes[group.closes.length - 1];
    return { label: label(group.key), open, high: Math.max(...group.closes, open), low: Math.min(...group.closes, open), close, change: open > 0 ? close / open - 1 : 0 };
  });
  return rows.slice(-keep).reverse();
}

const isoWeek = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};
const fmtDay = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtWeek = (key: string) => `Week of ${new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
const fmtMonth = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

type MaxChart = { chart?: { result?: { meta?: { currency?: string }; timestamp?: number[]; indicators: { quote: { high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] } }[] } };

/** Whole-life monthly prices for shares and ETFs, which give the all-time high and the year-by-year table. */
async function yahooLifetime(symbol: string): Promise<{ dates: string[]; closes: number[]; highs: number[]; lows: number[] } | null> {
  for (const host of ["query1", "query2"]) {
    try {
      const data = await getJson<MaxChart>(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=max&interval=1mo`);
      const result = data.chart?.result?.[0];
      const quote = result?.indicators.quote[0];
      if (!result?.timestamp || !quote) continue;
      const divisor = result.meta?.currency === "GBp" ? 100 : 1;
      const dates: string[] = [];
      const closes: number[] = [];
      const highs: number[] = [];
      const lows: number[] = [];
      result.timestamp.forEach((stamp, index) => {
        const close = quote.close?.[index];
        if (typeof close !== "number" || !Number.isFinite(close)) return;
        dates.push(new Date(stamp * 1000).toISOString().slice(0, 10));
        closes.push(close / divisor);
        const h = quote.high?.[index];
        const l = quote.low?.[index];
        highs.push(typeof h === "number" && Number.isFinite(h) ? h / divisor : close / divisor);
        lows.push(typeof l === "number" && Number.isFinite(l) && l > 0 ? l / divisor : close / divisor);
      });
      return { dates, closes, highs, lows };
    } catch {
      // try the other host
    }
  }
  return null;
}

type CgCoin = {
  description?: { en?: string };
  categories?: (string | null)[];
  links?: { homepage?: string[] };
  market_cap_rank?: number | null;
  market_data?: {
    circulating_supply?: number | null; total_supply?: number | null; max_supply?: number | null;
    ath?: { gbp?: number }; ath_date?: { gbp?: string }; ath_change_percentage?: { gbp?: number };
    atl?: { gbp?: number }; atl_date?: { gbp?: string }; atl_change_percentage?: { gbp?: number };
  };
};

type YahooSummary = {
  quoteSummary?: { result?: {
    assetProfile?: { longBusinessSummary?: string; sector?: string; industry?: string; website?: string };
    summaryDetail?: { trailingPE?: unknown; dividendYield?: unknown; beta?: unknown };
    defaultKeyStatistics?: { beta?: unknown; sharesOutstanding?: unknown };
  }[] };
};

export async function buildFacts(asset: AssetRow, series: PriceSeries): Promise<AssetFacts> {
  const facts: AssetFacts = {
    about: null, about_source: null, categories: [], sector: null, industry: null, website: null, rank: null,
    circulating_supply: null, total_supply: null, max_supply: null, ath: null, atl: null, pe: null, dividend_yield: null, beta: null,
    up_days_30: 0, down_days_30: 0,
    history: {
      day: periodRows(series.dates, series.closes, (d) => d, 14, fmtDay),
      week: periodRows(series.dates, series.closes, isoWeek, 12, fmtWeek),
      month: periodRows(series.dates, series.closes, (d) => d.slice(0, 7), 12, fmtMonth),
      year: [],
    },
  };
  const recent = series.closes.slice(-31);
  for (let index = 1; index < recent.length; index += 1) {
    if (recent[index] > recent[index - 1]) facts.up_days_30 += 1;
    else if (recent[index] < recent[index - 1]) facts.down_days_30 += 1;
  }

  if (asset.provider === "cg") {
    const id = asset.key.slice(3);
    const coin = await getJson<CgCoin>(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
    ).catch(() => null);
    if (coin) {
      const text = coin.description?.en ? plainText(coin.description.en) : "";
      facts.about = text || null;
      facts.about_source = text ? { name: "CoinGecko", url: `https://www.coingecko.com/en/coins/${id}` } : null;
      facts.categories = (coin.categories ?? []).filter((name): name is string => !!name).slice(0, 8);
      facts.website = coin.links?.homepage?.find((url) => url) ?? null;
      facts.rank = coin.market_cap_rank ?? null;
      const m = coin.market_data;
      facts.circulating_supply = finite(m?.circulating_supply);
      facts.total_supply = finite(m?.total_supply);
      facts.max_supply = finite(m?.max_supply);
      const ath = finite(m?.ath?.gbp);
      const athDate = m?.ath_date?.gbp;
      if (ath && athDate && asset.price_gbp) facts.ath = { price: ath, date: athDate.slice(0, 10), below_by: asset.price_gbp / ath - 1, days_since: daysBetween(athDate), scope: "all-time" };
      const atl = finite(m?.atl?.gbp);
      const atlDate = m?.atl_date?.gbp;
      if (atl && atlDate && asset.price_gbp) facts.atl = { price: atl, date: atlDate.slice(0, 10), above_by: asset.price_gbp / atl - 1 };
    }
    return facts;
  }

  const [lifetime, auth] = await Promise.all([yahooLifetime(asset.symbol), getYahooSession().catch(() => null)]);
  if (lifetime) {
    facts.history.year = periodRows(lifetime.dates, lifetime.closes, (d) => d.slice(0, 4), 10, (key) => key);
    // Old prices on exchanges outside the US are often in different units or before share consolidations, so for those the high is
    // taken over the last ten years only, and labelled that way.
    const limited = asset.symbol.includes(".");
    const cutoff = new Date(Date.now() - 10 * 365 * 86_400_000).toISOString().slice(0, 10);
    let best = -1;
    lifetime.dates.forEach((date, index) => {
      if (limited && date < cutoff) return;
      if (best === -1 || lifetime.highs[index] > lifetime.highs[best]) best = index;
    });
    if (best >= 0 && asset.price) {
      facts.ath = { price: lifetime.highs[best], date: lifetime.dates[best], below_by: asset.price / lifetime.highs[best] - 1, days_since: daysBetween(lifetime.dates[best]), scope: limited ? "10-year" : "all-time" };
    }
  }
  if (auth) {
    const summary = await getJson<YahooSummary>(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(asset.symbol)}?modules=assetProfile,summaryDetail,defaultKeyStatistics&crumb=${encodeURIComponent(auth.crumb)}`,
      { headers: { Cookie: auth.cookie, "User-Agent": UA } },
    ).catch(() => null);
    const result = summary?.quoteSummary?.result?.[0];
    if (result) {
      const text = result.assetProfile?.longBusinessSummary ? plainText(result.assetProfile.longBusinessSummary) : "";
      facts.about = text || null;
      facts.about_source = text ? { name: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${encodeURIComponent(asset.symbol)}/profile/` } : null;
      facts.sector = result.assetProfile?.sector ?? null;
      facts.industry = result.assetProfile?.industry ?? null;
      facts.website = result.assetProfile?.website ?? null;
      facts.pe = raw(result.summaryDetail?.trailingPE);
      facts.dividend_yield = raw(result.summaryDetail?.dividendYield);
      facts.beta = raw(result.summaryDetail?.beta) ?? raw(result.defaultKeyStatistics?.beta);
      facts.circulating_supply = raw(result.defaultKeyStatistics?.sharesOutstanding);
    }
  }
  return facts;
}
