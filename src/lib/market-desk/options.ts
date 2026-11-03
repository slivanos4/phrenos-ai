import type { SignalRow } from "@/lib/market-desk/signals";

/**
 * Unusual options activity for US stocks, from Yahoo's option chains. Traders who expect a big move often show it
 * here first: lots of contracts changing hands compared with how many already exist (open interest), and a lopsided
 * mix of calls (bets on a rise) against puts (bets on a fall). It is unofficial data and is delayed.
 */
const UA = "Mozilla/5.0 (compatible; PhrenosMarketDesk/1.0)";

let session: { cookie: string; crumb: string; at: number } | null = null;

export async function getYahooSession(): Promise<{ cookie: string; crumb: string } | null> {
  if (session && Date.now() - session.at < 30 * 60000) return session;
  const home = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(15000) }).catch(() => null);
  const cookie = home?.headers.getSetCookie().map((line) => line.split(";")[0]).join("; ");
  if (!cookie) return null;
  const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  const crumb = crumbResponse?.ok ? await crumbResponse.text() : "";
  if (!crumb) return null;
  session = { cookie, crumb, at: Date.now() };
  return session;
}

type Contract = { strike: number; volume?: number; openInterest?: number };
type Chain = { calls: Contract[]; puts: Contract[] };

async function chain(ticker: string, auth: { cookie: string; crumb: string }, expiration?: number): Promise<{ chain: Chain; expirations: number[] } | null> {
  const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(ticker)}?crumb=${encodeURIComponent(auth.crumb)}${expiration ? `&date=${expiration}` : ""}`;
  const response = await fetch(url, { headers: { "User-Agent": UA, Cookie: auth.cookie }, signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!response?.ok) return null;
  const result = ((await response.json()) as { optionChain?: { result?: { expirationDates: number[]; options: Chain[] }[] } }).optionChain?.result?.[0];
  if (!result?.options[0]) return null;
  return { chain: result.options[0], expirations: result.expirationDates };
}

export function optionsSignal(ticker: string, key: string | null, chains: Chain[]): SignalRow | null {
  const calls = chains.flatMap((entry) => entry.calls);
  const puts = chains.flatMap((entry) => entry.puts);
  const callVolume = calls.reduce((sum, contract) => sum + (contract.volume ?? 0), 0);
  const putVolume = puts.reduce((sum, contract) => sum + (contract.volume ?? 0), 0);
  if (callVolume + putVolume < 5000) return null;

  const unusual = (list: Contract[]) => list.filter((contract) => (contract.volume ?? 0) >= 1500 && (contract.volume ?? 0) >= (contract.openInterest ?? 0) * 3);
  const unusualCalls = unusual(calls).length;
  const unusualPuts = unusual(puts).length;
  if (unusualCalls + unusualPuts < 3) return null;

  const ratio = putVolume / Math.max(1, callVolume);
  const bullish = unusualCalls > unusualPuts && ratio < 1.2;
  const bearish = unusualPuts > unusualCalls && ratio > 0.8;
  const direction = bullish ? "bullish" : bearish ? "bearish" : "neutral";
  return {
    asset_key: key,
    symbol: ticker.toUpperCase(),
    signal_type: "options_activity",
    direction,
    strength: Math.min(5, 1 + Math.floor((unusualCalls + unusualPuts) / 2)),
    summary: `${ticker.toUpperCase()} options traded ${callVolume.toLocaleString("en-GB")} calls against ${putVolume.toLocaleString("en-GB")} puts over the nearest expiries, with ${unusualCalls} call and ${unusualPuts} put contracts trading at 3 times or more their open interest. ${direction === "bullish" ? "Unusually heavy call buying can mean traders are betting on a rise." : direction === "bearish" ? "Unusually heavy put buying can mean traders are protecting against, or betting on, a fall." : "The mix is balanced, so it does not point either way."} Options can also be used to hedge, so this is a hint, not proof.`,
    data: { callVolume, putVolume, unusualCalls, unusualPuts },
    source_url: `https://finance.yahoo.com/quote/${ticker}/options/`,
    observed_at: new Date().toISOString(),
  };
}

export async function optionsSignals(tickers: { ticker: string; key: string | null }[]): Promise<SignalRow[]> {
  const auth = await getYahooSession();
  if (!auth) return [];
  const rows: SignalRow[] = [];
  for (const { ticker, key } of tickers.slice(0, 25)) {
    try {
      const first = await chain(ticker, auth);
      if (!first) continue;
      const chains = [first.chain];
      for (const expiration of first.expirations.slice(1, 3)) {
        const next = await chain(ticker, auth, expiration);
        if (next) chains.push(next.chain);
      }
      const signal = optionsSignal(ticker, key, chains);
      if (signal) rows.push(signal);
    } catch {
      // Skip a ticker that fails.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return rows;
}
