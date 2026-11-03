import { fxRate, yahooSeries } from "@/lib/market-desk/providers";
import { computeMetrics } from "@/lib/market-desk/metrics";
import type { AssetType, PriceSeries } from "@/lib/market-desk/types";

/** What the weekly scan looks at. A broad, liquid set across the markets she follows, not every listed security. */
export const STOCKS: [string, string][] = [
  // US
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "Nvidia"], ["GOOGL", "Alphabet"], ["AMZN", "Amazon"],
  ["META", "Meta"], ["TSLA", "Tesla"], ["AVGO", "Broadcom"], ["JPM", "JPMorgan"], ["V", "Visa"],
  ["LLY", "Eli Lilly"], ["XOM", "Exxon Mobil"], ["WMT", "Walmart"], ["COST", "Costco"], ["NFLX", "Netflix"],
  ["AMD", "AMD"], ["CRM", "Salesforce"], ["ORCL", "Oracle"], ["PLTR", "Palantir"], ["UNH", "UnitedHealth"],
  ["BRK-B", "Berkshire Hathaway"], ["COIN", "Coinbase"], ["MSTR", "Strategy"], ["NEE", "NextEra Energy"], ["CAT", "Caterpillar"],
  // UK
  ["SHEL.L", "Shell"], ["AZN.L", "AstraZeneca"], ["HSBA.L", "HSBC"], ["ULVR.L", "Unilever"], ["BP.L", "BP"],
  ["GSK.L", "GSK"], ["RIO.L", "Rio Tinto"], ["BATS.L", "British American Tobacco"], ["LSEG.L", "LSEG"], ["BARC.L", "Barclays"],
  ["LLOY.L", "Lloyds"], ["REL.L", "RELX"], ["NG.L", "National Grid"], ["RR.L", "Rolls-Royce"], ["GLEN.L", "Glencore"],
  // Europe
  ["ASML.AS", "ASML"], ["SAP.DE", "SAP"], ["SIE.DE", "Siemens"], ["MC.PA", "LVMH"], ["OR.PA", "L'Oreal"],
  ["TTE.PA", "TotalEnergies"], ["AIR.PA", "Airbus"], ["ALV.DE", "Allianz"], ["NESN.SW", "Nestle"], ["NOVN.SW", "Novartis"],
];

export const ETFS: [string, string, AssetType][] = [
  ["SPY", "S&P 500 ETF", "etf"], ["QQQ", "Nasdaq 100 ETF", "etf"], ["VWRL.L", "FTSE All-World ETF", "etf"],
  ["ISF.L", "FTSE 100 ETF", "etf"], ["EEM", "Emerging markets ETF", "etf"], ["TLT", "US 20+ year bonds", "bond"],
  ["IEF", "US 7-10 year bonds", "bond"], ["AGG", "US aggregate bonds", "bond"], ["GLD", "Gold ETF", "etf"],
  ["IGLT.L", "UK gilts ETF", "bond"],
];

export const COMMODITIES: [string, string][] = [
  ["GC=F", "Gold"], ["SI=F", "Silver"], ["HG=F", "Copper"], ["PL=F", "Platinum"], ["PA=F", "Palladium"],
  ["CL=F", "Crude oil (WTI)"], ["BZ=F", "Brent oil"], ["NG=F", "Natural gas"], ["ZW=F", "Wheat"], ["KC=F", "Coffee"],
];

/** Currencies measured against the dollar. The flag says whether Yahoo quotes the pair as USD per unit (true) or units per USD (false). */
export const CURRENCIES: { code: string; symbol: string; perUsd: boolean }[] = [
  { code: "EUR", symbol: "EURUSD=X", perUsd: false },
  { code: "GBP", symbol: "GBPUSD=X", perUsd: false },
  { code: "JPY", symbol: "JPY=X", perUsd: true },
  { code: "CHF", symbol: "CHF=X", perUsd: true },
  { code: "AUD", symbol: "AUDUSD=X", perUsd: false },
  { code: "CAD", symbol: "CAD=X", perUsd: true },
  { code: "NZD", symbol: "NZDUSD=X", perUsd: false },
  { code: "CNY", symbol: "CNY=X", perUsd: true },
  { code: "SEK", symbol: "SEK=X", perUsd: true },
  { code: "NOK", symbol: "NOK=X", perUsd: true },
];

export type Leader = {
  key: string;
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  price: number;
  change_30d: number | null;
  change_90d: number | null;
  vs_sma200: number | null;
  vol_30d: number | null;
  risk_score: number;
  risk_label: string;
  strength: number;
};

/** Momentum blend: three months matter most, then one month, then whether it sits above its long-term average. */
function strengthOf(series: PriceSeries): Leader {
  const metrics = computeMetrics(series);
  const vsSma = metrics.sma200 ? metrics.price / metrics.sma200 - 1 : null;
  const strength =
    (metrics.change_90d ?? 0) * 0.5 + (metrics.change_30d ?? 0) * 0.3 + (vsSma ?? 0) * 0.2;
  return {
    key: series.key,
    symbol: series.symbol,
    name: series.name,
    type: series.type,
    currency: series.currency,
    price: metrics.price,
    change_30d: metrics.change_30d,
    change_90d: metrics.change_90d,
    vs_sma200: vsSma,
    vol_30d: metrics.vol_30d,
    risk_score: metrics.risk_score,
    risk_label: metrics.risk_label,
    strength,
  };
}

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = await Promise.all(
      items.slice(index, index + size).map((item) => work(item).catch((): null => null)),
    );
    for (const entry of batch) if (entry !== null) out.push(entry as R);
  }
  return out;
}

export async function scanStocksEtfsCommodities(): Promise<Leader[]> {
  const symbols = [
    ...STOCKS.map(([symbol, name]) => ({ symbol, name, type: undefined as AssetType | undefined })),
    ...ETFS.map(([symbol, name, type]) => ({ symbol, name, type })),
    ...COMMODITIES.map(([symbol, name]) => ({ symbol, name, type: "commodity" as AssetType })),
  ];
  return inBatches(symbols, 8, async (entry) => {
    const series = await yahooSeries(entry.symbol);
    if (entry.type) series.type = entry.type;
    const leader = strengthOf(series);
    return { ...leader, name: entry.name };
  });
}

export type CurrencyStrength = { code: string; change_30d: number; change_90d: number; strength: number };

/** Each currency's move against the dollar, then ranked against the group average (the dollar itself is the mirror image). */
export async function scanCurrencies(): Promise<CurrencyStrength[]> {
  const raw = await inBatches(CURRENCIES, 5, async (currency) => {
    const series = await yahooSeries(currency.symbol, "6mo");
    const changeOf = (days: number) => {
      const closes = series.closes;
      if (closes.length <= days) return 0;
      const move = closes[closes.length - 1] / closes[closes.length - 1 - days] - 1;
      return currency.perUsd ? 1 / (1 + move) - 1 : move;
    };
    return { code: currency.code, change_30d: changeOf(21), change_90d: changeOf(63) };
  });
  const avg30 = raw.reduce((sum, item) => sum + item.change_30d, 0) / (raw.length || 1);
  const avg90 = raw.reduce((sum, item) => sum + item.change_90d, 0) / (raw.length || 1);
  const rows = [
    ...raw,
    { code: "USD", change_30d: -avg30, change_90d: -avg90 },
  ];
  return rows
    .map((item) => ({ ...item, strength: item.change_90d * 0.6 + item.change_30d * 0.4 - (item.code === "USD" ? 0 : 0) }))
    .sort((a, b) => b.strength - a.strength);
}

type CgMarketRow = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap_rank: number | null;
  market_cap: number;
  total_volume: number;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_200d_in_currency?: number | null;
};

export type CryptoLeader = {
  key: string;
  symbol: string;
  name: string;
  rank: number | null;
  price_gbp: number;
  change_7d: number | null;
  change_30d: number | null;
  change_200d: number | null;
  volume_to_cap: number;
  strength: number;
};

export async function scanCrypto(): Promise<CryptoLeader[]> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=gbp&order=market_cap_desc&per_page=60&page=1&price_change_percentage=7d,30d,200d",
    { headers: { "User-Agent": "PhrenosMarketDesk/1.0" }, signal: AbortSignal.timeout(20000), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
  const rows = (await response.json()) as CgMarketRow[];
  const stable = /^(usdt|usdc|dai|usde|fdusd|tusd|usds|pyusd|usd1|usdd)$/i;
  return rows
    .filter((row) => !stable.test(row.symbol))
    .map((row) => {
      const c7 = row.price_change_percentage_7d_in_currency ?? null;
      const c30 = row.price_change_percentage_30d_in_currency ?? null;
      const c200 = row.price_change_percentage_200d_in_currency ?? null;
      return {
        key: `cg:${row.id}`,
        symbol: row.symbol.toUpperCase(),
        name: row.name,
        rank: row.market_cap_rank,
        price_gbp: row.current_price,
        change_7d: c7 === null ? null : c7 / 100,
        change_30d: c30 === null ? null : c30 / 100,
        change_200d: c200 === null ? null : c200 / 100,
        volume_to_cap: row.market_cap ? row.total_volume / row.market_cap : 0,
        strength: ((c200 ?? 0) * 0.4 + (c30 ?? 0) * 0.4 + (c7 ?? 0) * 0.2) / 100,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

export async function gbpPerUnit(code: string): Promise<number> {
  return fxRate(code, "GBP");
}
