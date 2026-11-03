import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";
import type { CryptoLeader } from "@/lib/market-desk/universe";

/**
 * "Smart money" signals from public data. What is and is not covered:
 * - Crypto: unusually heavy trading volume, large on-chain transfers, and (with a WHALE_ALERT_API_KEY) labelled
 *   exchange inflows and outflows.
 * - Stocks: insider buying and selling from US SEC Form 4 filings.
 * Not covered: fund holdings (13F) and options flow, which have no reliable free source.
 */
const SEC_UA = "PhrenosMarketDesk/1.0 (contact@phrenosai.com)";

export type SignalRow = {
  asset_key: string | null;
  symbol: string;
  signal_type: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: number;
  summary: string;
  data: Record<string, unknown>;
  source_url: string | null;
  observed_at: string;
};

export function volumeSignals(leaders: CryptoLeader[]): SignalRow[] {
  return leaders
    .filter((coin) => coin.volume_to_cap >= 0.25 && coin.rank !== null && coin.rank <= 60)
    .map<SignalRow>((coin) => {
      const move = coin.change_7d ?? 0;
      return {
        asset_key: coin.key,
        symbol: coin.symbol,
        signal_type: "volume_spike",
        direction: move > 0.05 ? "bullish" : move < -0.05 ? "bearish" : "neutral",
        strength: Math.min(5, Math.round(coin.volume_to_cap * 8)),
        summary: `${coin.name} traded ${(coin.volume_to_cap * 100).toFixed(0)}% of its whole market value in 24 hours, which is unusually heavy, while its price moved ${(move * 100).toFixed(1)}% over 7 days.`,
        data: { volume_to_cap: coin.volume_to_cap, change_7d: coin.change_7d },
        source_url: `https://www.coingecko.com/en/coins/${coin.key.slice(3)}`,
        observed_at: new Date().toISOString(),
      };
    });
}

type BlockchairTx = { hash: string; time: string; output_total: number };

/** Large Bitcoin transfers in the last day. Without exchange labels the direction is unknown, so they are neutral. */
async function bitcoinWhales(): Promise<SignalRow[]> {
  try {
    const since = new Date(Date.now() - 86400000).toISOString().slice(0, 19).replace("T", "+");
    const query = encodeURIComponent(`output_total(100000000000..),time(${since}..)`);
    const response = await fetch(
      `https://api.blockchair.com/bitcoin/transactions?q=${query}&s=output_total(desc)&limit=5`,
      { signal: AbortSignal.timeout(15000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const { data } = (await response.json()) as { data?: BlockchairTx[] };
    return (data ?? []).map<SignalRow>((tx) => {
      const btc = tx.output_total / 1e8;
      return {
        asset_key: "cg:bitcoin",
        symbol: "BTC",
        signal_type: "whale_transfer",
        direction: "neutral",
        strength: btc >= 5000 ? 4 : btc >= 2000 ? 3 : 2,
        summary: `A single Bitcoin transfer of about ${btc.toLocaleString("en-GB", { maximumFractionDigits: 0 })} BTC moved in the last day. Without exchange labels, it is not possible to say whether it points to buying or selling.`,
        data: { btc, hash: tx.hash },
        source_url: `https://blockchair.com/bitcoin/transaction/${tx.hash}`,
        observed_at: new Date(`${tx.time.replace(" ", "T")}Z`).toISOString(),
      };
    });
  } catch {
    return [];
  }
}

type WhaleAlertTx = {
  blockchain: string;
  symbol: string;
  amount_usd: number;
  from: { owner_type: string; owner?: string };
  to: { owner_type: string; owner?: string };
  hash: string;
  timestamp: number;
};

/** Labelled exchange flows, available when a Whale Alert key is set. Moves onto exchanges lean bearish, off exchanges lean bullish. */
async function whaleAlert(): Promise<SignalRow[]> {
  const key = process.env.WHALE_ALERT_API_KEY?.trim();
  if (!key) return [];
  try {
    const start = Math.floor(Date.now() / 1000) - 3 * 3600;
    const response = await fetch(
      `https://api.whale-alert.io/v1/transactions?api_key=${key}&min_value=5000000&start=${start}&limit=20`,
      { signal: AbortSignal.timeout(15000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const { transactions } = (await response.json()) as { transactions?: WhaleAlertTx[] };
    return (transactions ?? [])
      .filter((tx) => tx.from.owner_type === "exchange" || tx.to.owner_type === "exchange")
      .map<SignalRow>((tx) => {
        const inflow = tx.to.owner_type === "exchange" && tx.from.owner_type !== "exchange";
        const outflow = tx.from.owner_type === "exchange" && tx.to.owner_type !== "exchange";
        const symbol = tx.symbol.toUpperCase();
        return {
          asset_key: null,
          symbol,
          signal_type: "whale_transfer",
          direction: inflow ? "bearish" : outflow ? "bullish" : "neutral",
          strength: tx.amount_usd >= 50e6 ? 5 : tx.amount_usd >= 20e6 ? 4 : 3,
          summary: `${symbol} worth about $${(tx.amount_usd / 1e6).toFixed(0)} million moved ${inflow ? "onto" : outflow ? "off" : "between"} an exchange (${tx.from.owner ?? tx.from.owner_type} to ${tx.to.owner ?? tx.to.owner_type}). ${inflow ? "Coins moving onto exchanges are often there to be sold." : outflow ? "Coins leaving exchanges are often being held for the long term." : ""}`.trim(),
          data: { amount_usd: tx.amount_usd, hash: tx.hash },
          source_url: `https://whale-alert.io/transaction/${tx.blockchain}/${tx.hash}`,
          observed_at: new Date(tx.timestamp * 1000).toISOString(),
        };
      });
  } catch {
    return [];
  }
}

let tickerMap: Map<string, string> | null = null;

async function cikFor(ticker: string): Promise<string | null> {
  if (!tickerMap) {
    const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": SEC_UA },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const rows = Object.values((await response.json()) as Record<string, { cik_str: number; ticker: string }>);
    tickerMap = new Map(rows.map((row) => [row.ticker.toUpperCase(), String(row.cik_str).padStart(10, "0")]));
  }
  return tickerMap.get(ticker.toUpperCase().replace(".", "-")) ?? null;
}

async function secJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { headers: { "User-Agent": SEC_UA }, signal: AbortSignal.timeout(20000) });
  return response.ok ? ((await response.json()) as T) : null;
}

type Submissions = {
  filings: { recent: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } };
};

/** Open-market insider buys and sells from recent Form 4 filings for one US-listed company. */
export async function insiderSignal(ticker: string, assetKey: string | null): Promise<SignalRow | null> {
  try {
    const cik = await cikFor(ticker);
    if (!cik) return null;
    const submissions = await secJson<Submissions>(`https://data.sec.gov/submissions/CIK${cik}.json`);
    if (!submissions) return null;
    const recent = submissions.filings.recent;
    const cutoff = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);

    let buyValue = 0;
    let sellValue = 0;
    let filings = 0;
    for (let index = 0; index < recent.form.length && filings < 8; index += 1) {
      if (recent.form[index] !== "4" || recent.filingDate[index] < cutoff) continue;
      filings += 1;
      const accession = recent.accessionNumber[index].replace(/-/g, "");
      const document = recent.primaryDocument[index].replace(/^xsl[^/]+\//, "");
      const response = await fetch(`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${document}`, {
        headers: { "User-Agent": SEC_UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) continue;
      const xml = await response.text();
      for (const block of xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/g) ?? []) {
        const code = block.match(/<transactionCode>(\w)<\/transactionCode>/)?.[1];
        const shares = Number(block.match(/<transactionShares>\s*<value>([\d.]+)</)?.[1] ?? 0);
        const price = Number(block.match(/<transactionPricePerShare>\s*<value>([\d.]+)</)?.[1] ?? 0);
        if (code === "P") buyValue += shares * price;
        if (code === "S") sellValue += shares * price;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (buyValue < 50000 && sellValue < 250000) return null;

    const net = buyValue - sellValue;
    const money = (value: number) => `$${value >= 1e6 ? `${(value / 1e6).toFixed(1)}m` : `${Math.round(value / 1000)}k`}`;
    const buying = buyValue > 0 && buyValue >= sellValue * 0.5;
    return {
      asset_key: assetKey,
      symbol: ticker.toUpperCase(),
      signal_type: buying ? "insider_buy" : "insider_sell",
      direction: buying ? "bullish" : "bearish",
      strength: Math.min(5, Math.max(1, Math.round(Math.log10(Math.max(1, Math.abs(net))) - 3))),
      summary: `Company insiders reported ${money(buyValue)} of open-market buying and ${money(sellValue)} of selling in the last 45 days. Insider buying is usually a stronger signal than selling, because insiders sell for many personal reasons.`,
      data: { buyValue, sellValue, filings },
      source_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=4`,
      observed_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function collectSignals(input: { crypto: CryptoLeader[]; usTickers: { ticker: string; key: string | null }[] }): Promise<SignalRow[]> {
  const [btc, labelled] = await Promise.all([bitcoinWhales(), whaleAlert()]);
  const rows: SignalRow[] = [...volumeSignals(input.crypto), ...btc, ...labelled];
  for (const { ticker, key } of input.usTickers.slice(0, 20)) {
    const signal = await insiderSignal(ticker, key);
    if (signal) rows.push(signal);
  }
  if (rows.length > 0) {
    const supabase = createServiceRoleClient();
    await supabase.from(T.signals).delete().lt("created_at", new Date(Date.now() - 21 * 86400000).toISOString());
    const { error } = await supabase.from(T.signals).insert(rows);
    if (error) throw new Error(error.message);
  }
  return rows;
}

export async function listSignals(limit = 60) {
  const { data, error } = await createServiceRoleClient()
    .from(T.signals)
    .select("*")
    .order("observed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
