import type { AssetType, PriceSeries, SearchHit } from "@/lib/market-desk/types";

/** Yahoo Finance (stocks, ETFs, FX, commodity futures) and CoinGecko (crypto). Both are free and need no key. */
const UA = "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)";

/** CoinGecko's free tier is strict. A free "demo" key (COINGECKO_API_KEY) raises the limit and is sent when present. */
function cgHeaders(url: string): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY?.trim();
  return key && url.includes("coingecko.com") ? { "x-cg-demo-api-key": key } : {};
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/json", ...cgHeaders(url), ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
    return (await response.json()) as T;
  }
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
  // Yahoo has two front doors. If one is down or blocking us, the other often still answers.
  let data: YahooChart | null = null;
  let failure: unknown = null;
  for (const host of ["query1", "query2"]) {
    try {
      data = await getJson<YahooChart>(
        `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
      );
      break;
    } catch (error) {
      failure = error;
    }
  }
  if (!data) {
    // Backup source. Its free plan covers US stocks and ETFs, currency pairs and gold, but not UK or European shares, silver or oil.
    const backup = await twelveSeries(symbol).catch(() => null);
    if (backup) return backup;
    throw failure instanceof Error ? failure : new Error("Yahoo Finance is not answering");
  }
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

/** Turns a Yahoo-style symbol into one Twelve Data's free plan can serve, or null when it cannot. */
export function twelveSymbol(symbol: string): { symbol: string; type: AssetType; currency: string; name?: string } | null {
  if (symbol === "GC=F") return { symbol: "XAU/USD", type: "commodity", currency: "USD", name: "Gold" };
  const pair = symbol.match(/^([A-Z]{3})([A-Z]{3})=X$/);
  if (pair) return { symbol: `${pair[1]}/${pair[2]}`, type: "fx", currency: pair[2] };
  const usd = symbol.match(/^([A-Z]{3})=X$/);
  if (usd) return { symbol: `USD/${usd[1]}`, type: "fx", currency: usd[1] };
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(symbol)) return { symbol: symbol.replace("-", "."), type: "stock", currency: "USD" };
  return null;
}

type TwelveSeries = { status?: string; meta?: { symbol: string; type?: string; currency?: string }; values?: { datetime: string; close: string }[] };

async function twelveSeries(symbol: string): Promise<PriceSeries | null> {
  const key = process.env.TWELVE_DATA_API_KEY?.trim();
  const mapped = twelveSymbol(symbol);
  if (!key || !mapped) return null;
  const data = await getJson<TwelveSeries>(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(mapped.symbol)}&interval=1day&outputsize=260&apikey=${key}`,
  );
  if (data.status === "error" || !data.values?.length) return null;
  const rows = [...data.values].reverse().filter((row) => Number.isFinite(Number(row.close)));
  if (rows.length < 5) return null;
  const type = data.meta?.type === "ETF" ? "etf" : mapped.type;
  return {
    key: `yahoo:${symbol}`,
    provider: "yahoo",
    symbol,
    name: mapped.name ?? symbol,
    type,
    currency: data.meta?.currency ?? mapped.currency,
    closes: rows.map((row) => Number(row.close)),
    dates: rows.map((row) => row.datetime.slice(0, 10)),
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
  const chart = await getJson<CgChart>(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=gbp&days=365&interval=daily`,
  );
  const points = (chart.prices ?? []).filter(([, price]) => Number.isFinite(price) && price > 0);
  const closes = points.map(([, price]) => price);
  const dates = points.map(([stamp]) => new Date(stamp).toISOString().slice(0, 10));
  if (closes.length < 5) throw new Error(`Not enough price history for ${id}`);

  const meta = await getJson<CgMarket>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=gbp&ids=${encodeURIComponent(id)}`,
  ).catch(() => [] as CgMarket);
  const gbpPrice = meta[0]?.current_price ?? closes[closes.length - 1];
  // Euro price comes from the pound price and the exchange rate, which saves a second CoinGecko call.
  const eurPrice = await fxRate("GBP", "EUR").then((rate) => gbpPrice * rate).catch(() => undefined);

  return {
    key: `cg:${id}`,
    provider: "cg",
    symbol: (meta[0]?.symbol ?? id).toUpperCase(),
    name: meta[0]?.name ?? id,
    type: "crypto",
    currency: "GBP",
    closes,
    dates,
    gbpPrice,
    eurPrice,
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
