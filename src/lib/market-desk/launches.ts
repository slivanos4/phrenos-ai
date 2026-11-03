import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";

/**
 * New tokens (DexScreener), upcoming IPOs (Nasdaq) and new-currency news. Everything new is treated as risky
 * until proven otherwise, and every token is checked against the common warning signs.
 */
type LaunchRow = {
  kind: "token" | "ipo" | "currency";
  name: string;
  symbol: string;
  summary: string;
  risk_flags: string[];
  risk_level: string;
  source_url: string;
  launched_at: string | null;
};

type DexProfile = { chainId: string; tokenAddress: string; description?: string; links?: { type?: string; url: string }[] };
type DexPair = {
  chainId: string;
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  pairCreatedAt?: number;
  txns?: { h24?: { buys: number; sells: number } };
  priceChange?: { h24?: number };
};

export function tokenFlags(pair: DexPair, hasSocials: boolean): string[] {
  const flags: string[] = [];
  const liquidity = pair.liquidity?.usd ?? 0;
  const ageDays = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 86400000 : 0;
  if (ageDays < 3) flags.push("Less than 3 days old");
  else if (ageDays < 14) flags.push("Less than 2 weeks old");
  if (liquidity < 25000) flags.push("Very little money in the trading pool, so it can be hard to sell");
  else if (liquidity < 100000) flags.push("Thin trading pool");
  if (!hasSocials) flags.push("No website or social accounts listed");
  if (pair.fdv && liquidity > 0 && pair.fdv / liquidity > 200) flags.push("Valuation is huge compared with the money actually in the pool");
  const txns = pair.txns?.h24;
  if (txns && txns.buys + txns.sells > 20 && txns.sells === 0) flags.push("Buys but no sells at all, which can mean it cannot be sold");
  if ((pair.priceChange?.h24 ?? 0) > 300) flags.push("Price up more than 300% in a day");
  return flags;
}

async function newTokens(): Promise<LaunchRow[]> {
  try {
    const profileResponse = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", { signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!profileResponse.ok) return [];
    const profiles = ((await profileResponse.json()) as DexProfile[]).slice(0, 30);
    const byChain = new Map<string, DexProfile[]>();
    for (const profile of profiles) byChain.set(profile.chainId, [...(byChain.get(profile.chainId) ?? []), profile]);

    const rows: LaunchRow[] = [];
    for (const [chain, list] of byChain) {
      const addresses = list.map((profile) => profile.tokenAddress).join(",");
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${addresses}`, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!response.ok) continue;
      const pairs = (await response.json()) as DexPair[];
      for (const profile of list) {
        const best = pairs
          .filter((pair) => pair.baseToken.address.toLowerCase() === profile.tokenAddress.toLowerCase())
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
        if (!best) continue;
        const flags = tokenFlags(best, (profile.links?.length ?? 0) > 0);
        rows.push({
          kind: "token",
          name: best.baseToken.name,
          symbol: best.baseToken.symbol.toUpperCase(),
          summary: `New token on ${chain}. Pool liquidity about $${Math.round((best.liquidity?.usd ?? 0) / 1000)}k, 24h volume about $${Math.round((best.volume?.h24 ?? 0) / 1000)}k.${profile.description ? ` ${profile.description.slice(0, 160)}` : ""}`,
          risk_flags: flags,
          risk_level: flags.length >= 3 ? "extreme" : "very high",
          source_url: best.url,
          launched_at: best.pairCreatedAt ? new Date(best.pairCreatedAt).toISOString() : null,
        });
      }
    }
    return rows.sort((a, b) => a.risk_flags.length - b.risk_flags.length).slice(0, 12);
  } catch {
    return [];
  }
}

type NasdaqRow = { dealID?: string; proposedTickerSymbol?: string; companyName?: string; proposedExchange?: string; proposedSharePrice?: string; sharesOffered?: string; expectedPriceDate?: string };

async function upcomingIpos(): Promise<LaunchRow[]> {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const response = await fetch(`https://api.nasdaq.com/api/ipo/calendar?date=${month}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json, text/plain, */*", Origin: "https://www.nasdaq.com" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: { upcoming?: { upcomingTable?: { rows?: NasdaqRow[] } }; priced?: { rows?: NasdaqRow[] } } };
    const upcoming = body.data?.upcoming?.upcomingTable?.rows ?? [];
    const priced = body.data?.priced?.rows ?? [];
    return [...upcoming, ...priced]
      .filter((row) => row.companyName && row.proposedTickerSymbol)
      .slice(0, 12)
      .map<LaunchRow>((row) => ({
        kind: "ipo",
        name: row.companyName ?? "",
        symbol: row.proposedTickerSymbol ?? "",
        summary: `IPO on ${row.proposedExchange ?? "a US exchange"}${row.proposedSharePrice ? ` at about $${row.proposedSharePrice} per share` : ""}${row.expectedPriceDate ? `, expected ${row.expectedPriceDate}` : ""}.`,
        risk_flags: ["New listings often swing sharply in their first weeks", "Little trading history to judge it by"],
        risk_level: "high",
        source_url: `https://www.nasdaq.com/market-activity/ipos?deal=${encodeURIComponent(row.dealID ?? row.proposedTickerSymbol ?? "")}`,
        launched_at: row.expectedPriceDate ? new Date(row.expectedPriceDate).toISOString() : null,
      }));
  } catch {
    return [];
  }
}

async function currencyNews(): Promise<LaunchRow[]> {
  if (!process.env.EXA_API_KEY?.trim()) return [];
  const { searchExaArticles } = await import("@/lib/phrenos-updates/exa-search");
  const end = new Date();
  const lookback = { lookbackStart: new Date(end.getTime() - 14 * 86400000).toISOString(), lookbackEnd: end.toISOString() };
  const result = await searchExaArticles({ query: "new currency launch central bank digital currency CBDC stablecoin launch redenomination", lookback, maxResults: 8 });
  return result.sources
    .filter((hit) => hit.url && hit.title)
    .map<LaunchRow>((hit) => ({
      kind: "currency",
      name: hit.title ?? "",
      symbol: "",
      summary: (hit.content ?? "").replace(/\s+/g, " ").slice(0, 280),
      risk_flags: [],
      risk_level: "unrated",
      source_url: hit.url ?? "",
      launched_at: hit.published_date ? new Date(hit.published_date).toISOString() : null,
    }));
}

export async function collectLaunches(): Promise<number> {
  const [tokens, ipos, currencies] = await Promise.all([newTokens(), upcomingIpos(), currencyNews()]);
  const rows = [...tokens, ...ipos, ...currencies].filter((row) => row.source_url);
  if (rows.length === 0) return 0;
  const supabase = createServiceRoleClient();
  await supabase.from(T.launches).delete().lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
  const { error } = await supabase.from(T.launches).upsert(rows, { onConflict: "source_url" });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function listLaunches(limit = 60) {
  const { data, error } = await createServiceRoleClient()
    .from(T.launches)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
