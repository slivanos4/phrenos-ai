import { fxRate, getJson } from "@/lib/market-desk/providers";

/**
 * The market-wide numbers shown above the rankings: total crypto market value, the Fear and Greed reading, what is trending,
 * and the exchange rates used by the currency switch. Every part is optional, so one failing feed never blanks the strip.
 */
export type MarketStats = {
  global: { market_cap_gbp: number; change_24h: number | null; volume_gbp: number | null; btc_dominance: number | null; eth_dominance: number | null } | null;
  fear_greed: { value: number; label: string; yesterday: number | null; last_week: number | null; at: string } | null;
  trending: { key: string; name: string; symbol: string; image: string | null; change_24h: number | null }[];
  /** Pounds to one unit of each currency. */
  rates: { GBP: number; USD: number | null; EUR: number | null };
  fetched_at: string;
  problems: string[];
};

type CgGlobal = { data?: { total_market_cap?: { gbp?: number }; total_volume?: { gbp?: number }; market_cap_percentage?: { btc?: number; eth?: number }; market_cap_change_percentage_24h_usd?: number } };
type Fng = { data?: { value: string; value_classification: string; timestamp: string }[] };
type CgTrending = { coins?: { item: { id: string; name: string; symbol: string; small?: string; thumb?: string; data?: { price_change_percentage_24h?: Record<string, number> } } }[] };

const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

let cache: { at: number; stats: MarketStats } | null = null;
const TTL = 10 * 60 * 1000;

export async function getMarketStats(force = false): Promise<MarketStats> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.stats;
  const problems: string[] = [];
  const guard = async <T>(label: string, work: () => Promise<T>): Promise<T | null> => {
    try {
      return await work();
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : "failed"}`);
      return null;
    }
  };

  const [global, fng, trending, usd, eur] = await Promise.all([
    guard("Total market value", () => getJson<CgGlobal>("https://api.coingecko.com/api/v3/global")),
    guard("Fear and Greed", () => getJson<Fng>("https://api.alternative.me/fng/?limit=8")),
    guard("Trending", () => getJson<CgTrending>("https://api.coingecko.com/api/v3/search/trending")),
    guard("Dollar rate", () => fxRate("GBP", "USD")),
    guard("Euro rate", () => fxRate("GBP", "EUR")),
  ]);

  const g = global?.data;
  const cap = finite(g?.total_market_cap?.gbp);
  const rows = fng?.data ?? [];
  const now = Number(rows[0]?.value);

  const stats: MarketStats = {
    // A total market value of nothing, or a Fear and Greed reading outside 0 to 100, is a broken feed rather than news.
    global: cap && cap > 0 ? {
      market_cap_gbp: cap,
      change_24h: finite(g?.market_cap_change_percentage_24h_usd) !== null ? (g!.market_cap_change_percentage_24h_usd as number) / 100 : null,
      volume_gbp: finite(g?.total_volume?.gbp),
      btc_dominance: finite(g?.market_cap_percentage?.btc),
      eth_dominance: finite(g?.market_cap_percentage?.eth),
    } : null,
    fear_greed: Number.isFinite(now) && now >= 0 && now <= 100 ? {
      value: now,
      label: rows[0].value_classification,
      yesterday: Number.isFinite(Number(rows[1]?.value)) ? Number(rows[1].value) : null,
      last_week: Number.isFinite(Number(rows[7]?.value)) ? Number(rows[7].value) : null,
      at: new Date(Number(rows[0].timestamp) * 1000).toISOString(),
    } : null,
    trending: (trending?.coins ?? []).slice(0, 7).map(({ item }) => ({
      key: `cg:${item.id}`,
      name: item.name,
      symbol: item.symbol.toUpperCase(),
      image: item.small ?? item.thumb ?? null,
      change_24h: finite(item.data?.price_change_percentage_24h?.gbp ?? item.data?.price_change_percentage_24h?.usd) !== null
        ? (item.data!.price_change_percentage_24h!.gbp ?? item.data!.price_change_percentage_24h!.usd) / 100
        : null,
    })),
    rates: { GBP: 1, USD: finite(usd), EUR: finite(eur) },
    fetched_at: new Date().toISOString(),
    problems,
  };
  // Keep the last good answer if everything failed, rather than blanking the strip.
  if (!stats.global && !stats.fear_greed && cache) return { ...cache.stats, problems };
  cache = { at: Date.now(), stats };
  return stats;
}
