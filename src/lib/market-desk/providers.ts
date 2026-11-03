import type { AssetType, PriceSeries, SearchHit } from "@/lib/market-desk/types";

/** Yahoo Finance (stocks, ETFs, FX, commodity futures) and CoinGecko (crypto). Both are free and need no key. */
const UA = "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return (await response.json()) as T;
}

function yahooType(instrumentType: string | undefined, symbol: string): AssetType {
  switch ((instrumentType ?? "").toUpperCase()) {
    case "ETF":
    case "MUTUALFUND":
      return "etf";
    case "CRYPTOCURRENCY":
      return "crypto";
    case "CURRENCY":
      return "fx";
    case "FUTURE":
      return "commodity";
    default:
      return symbol.endsWith("=F") ? "commodity" : symbol.endsWith("=X") ? "fx" : "stock";
  }
}

type YahooChart = {
  chart: {
    result?: {
      meta: {
        currency?: string;
        symbol: string;
        longName?: string;
        shortName?: string;
        instrumentType?: string;
      };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
    error?: { description?: string } | null;
  };
};

export async function yahooSeries(symbol: string, range = "1y"): Promise<PriceSeries> {
  const data = await getJson<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
  );
  const result = data.chart.result?.[0];
  if (!result) throw new Error(data.chart.error?.description ?? `No data for ${symbol}`);

  // London shares are quoted in pence ("GBp"). Work in pounds.
  const pence = result.meta.currency === "GBp";
  const divisor = pence ? 100 : 1;
  const closes: number[] = [];
  const dates: string[] = [];
  (result.indicators.quote[0]?.close ?? []).forEach((value, index) => {
    const stamp = result.timestamp?.[index];
    if (typeof value !== "number" || !Number.isFinite(value) || !stamp) return;
    closes.push(value / divisor);
    dates.push(new Date(stamp * 1000).toISOString().slice(0, 10));
  });
  if (closes.length < 5) throw new Error(`Not enough price history for ${symbol}`);

  return {
    key: `yahoo:${result.meta.symbol}`,
    provider: "yahoo",
    symbol: result.meta.symbol,
    name: result.meta.longName ?? result.meta.shortName ?? result.meta.symbol,
    type: yahooType(result.meta.instrumentType, result.meta.symbol),
    currency: pence ? "GBP" : (result.meta.currency ?? "USD").toUpperCase(),
    closes,
    dates,
  };
}

type YahooSearch = {
  quotes?: {
    symbol: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchDisp?: string;
  }[];
};

export async function yahooSearch(query: string): Promise<SearchHit[]> {
  const data = await getJson<YahooSearch>(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
  );
  return (data.quotes ?? [])
    .filter((quote) => quote.symbol && quote.quoteType !== "OPTION")
    .map((quote) => ({
      key: `yahoo:${quote.symbol}`,
      provider: "yahoo" as const,
      symbol: quote.symbol,
      name: quote.longname ?? quote.shortname ?? quote.symbol,
      type: yahooType(quote.quoteType, quote.symbol),
      exchange: quote.exchDisp ?? "",
    }));
}

type CgSearch = { coins?: { id: string; name: string; symbol: string; market_cap_rank?: number | null }[] };

export async function cgSearch(query: string): Promise<SearchHit[]> {
  const data = await getJson<CgSearch>(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
  );
  return (data.coins ?? []).slice(0, 6).map((coin) => ({
    key: `cg:${coin.id}`,
    provider: "cg" as const,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    type: "crypto" as const,
    exchange: coin.market_cap_rank ? `Rank #${coin.market_cap_rank}` : "Crypto",
  }));
}

type CgChart = { prices?: [number, number][] };
type CgMarket = { id: string; symbol: string; name: string; current_price: number }[];

export async function cgSeries(id: string): Promise<PriceSeries> {
  const [chart, eur] = await Promise.all([
    getJson<CgChart>(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=gbp&days=365&interval=daily`,
    ),
    getJson<CgMarket>(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${encodeURIComponent(id)}`,
    ).catch(() => [] as CgMarket),
  ]);
  const points = (chart.prices ?? []).filter(([, price]) => Number.isFinite(price) && price > 0);
  const closes = points.map(([, price]) => price);
  const dates = points.map(([stamp]) => new Date(stamp).toISOString().slice(0, 10));
  if (closes.length < 5) throw new Error(`Not enough price history for ${id}`);

  const meta = await getJson<CgMarket>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=gbp&ids=${encodeURIComponent(id)}`,
  ).catch(() => [] as CgMarket);

  return {
    key: `cg:${id}`,
    provider: "cg",
    symbol: (meta[0]?.symbol ?? id).toUpperCase(),
    name: meta[0]?.name ?? id,
    type: "crypto",
    currency: "GBP",
    closes,
    dates,
    gbpPrice: meta[0]?.current_price ?? closes[closes.length - 1],
    eurPrice: eur[0]?.current_price,
  };
}

export async function fetchSeries(key: string): Promise<PriceSeries> {
  const [provider, ...rest] = key.split(":");
  const id = rest.join(":");
  if (provider === "cg") return cgSeries(id);
  if (provider === "yahoo") return yahooSeries(id);
  throw new Error(`Unknown asset key ${key}`);
}

export async function searchAssets(query: string): Promise<SearchHit[]> {
  const [yahoo, crypto] = await Promise.all([
    yahooSearch(query).catch(() => [] as SearchHit[]),
    cgSearch(query).catch(() => [] as SearchHit[]),
  ]);
  // Yahoo also lists crypto pairs such as BTC-USD. CoinGecko is the better source for those.
  const yahooOnly = yahoo.filter((hit) => hit.type !== "crypto");
  return [...yahooOnly.slice(0, 7), ...crypto.slice(0, 4)];
}

const fxCache = new Map<string, number>();

/** Rate to turn one unit of `from` into `to`. Cached for the life of the process. */
export async function fxRate(from: string, to: string): Promise<number> {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return 1;
  const cached = fxCache.get(`${a}${b}`);
  if (cached) return cached;
  const series = await yahooSeries(`${a}${b}=X`, "5d");
  const rate = series.closes[series.closes.length - 1];
  fxCache.set(`${a}${b}`, rate);
  return rate;
}
