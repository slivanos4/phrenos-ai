import { callAnthropic, extractJsonObject, isAnthropicConfigured } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { fetchNews, type NewsItem } from "@/lib/market-desk/news";
import { loadFundamentals } from "@/lib/market-desk/facts";
import { fundamentalsForPrompt, priceVsBusiness, type Fundamentals } from "@/lib/market-desk/fundamentals";
import { historicalOdds, type Odds } from "@/lib/market-desk/odds";
import { outlookFrom, type Outlook } from "@/lib/market-desk/outlook-core";
import { numbersGrounded } from "@/lib/market-desk/pulse";
import { yahooSeries } from "@/lib/market-desk/providers";
import { rankingFor } from "@/lib/market-desk/rankings";
import { listHoldings, listWatchlist, refreshAsset, T } from "@/lib/market-desk/store";
import type { AssetRow } from "@/lib/market-desk/types";

/**
 * The refreshable part of an asset page: a short research note that takes in today's news, and an outlook paragraph that says where the
 * price pattern stands, what happened after similar episodes in the past, and what would have to change for a turn. The outlook is
 * written to describe, not predict: hedged language only, no price targets, no buy or sell wording, and any figure must come from the data.
 */
export type ViewRecord = {
  asset_key: string;
  note: string;
  outlook_text: string;
  state: string;
  odds: Odds | null;
  news: { title: string; publisher: string; link: string; published: string | null }[];
  updated_at: string;
};

const BANNED = /\b(buy|sell|hold|accumulate|should (invest|buy|sell)|price target|guaranteed?|definitely|certainly|will (rise|fall|reach|hit|crash|soar|double|recover|rebound|bounce|go up|go down|continue)|to the moon)\b/i;
const DASHES = /[–—]/;

const pct1 = (value: number | null) => (value === null ? null : `${value >= 0 ? "up" : "down"} ${Math.abs(value * 100).toFixed(1)}%`);

const RULES = `You write for a private market research dashboard. For each asset you are given its recent price moves, a plain-language trend reading, what happened after similar episodes in its own past, and numbered recent news headlines. Write two things per asset:

"note": 3 or 4 plain sentences on where it stands today, including what the news says (name the headline's subject, not the headline number), what the company's own reported results say when they are given (growth, profit, whether it beat estimates, valuation, and how analysts as a group rate it, described as other people's opinion), and the strongest argument against the current picture. When price and business disagree, say so plainly.

"outlook": 3 or 4 plain sentences answering: could the current trend stop or turn? Say what the price pattern suggests, what the historical record shows (quote the figures you are given, and if "reliable" is false say there are too few similar cases to lean on), and what would have to happen for a turn, or what would make it worse (including the next results date if given). Be honest that nobody can know.

RULES: This is research, not advice and not a forecast. Never say buy, sell, hold, or what to invest. No price targets. Never state the future as certain: use "could", "might", "may". Use ONLY facts and numbers that appear in the data given, and never add background from your own knowledge. Stay close to the headlines' own wording and do not add dramatic words. British English. Do not use any dash characters such as em dashes or en dashes.

Return ONLY a JSON object mapping each asset "key" to {"note": string, "outlook": string}.`;

type Prepared = { asset: AssetRow; news: NewsItem[]; outlook: Outlook; odds: Odds; ranking: Awaited<ReturnType<typeof rankingFor>>; fundamentals: Fundamentals | null };

export async function prepare(key: string): Promise<Prepared> {
  const { asset, series } = await refreshAsset(key);
  const closes = key.startsWith("yahoo:") ? await yahooSeries(key.slice(6), "5y").then((s) => s.closes).catch(() => series.closes) : series.closes;
  const [news, ranking, fundamentals] = await Promise.all([fetchNews(asset), rankingFor(key), loadFundamentals(asset).catch(() => null)]);
  const outlook = outlookFrom({
    change_1d: asset.change_1d, change_7d: asset.change_7d, change_30d: asset.change_30d, change_90d: asset.change_90d,
    vs_sma200: asset.sma200 && asset.price ? asset.price / asset.sma200 - 1 : null,
  });
  return { asset, news, outlook, odds: historicalOdds(closes, key.startsWith("cg:") ? 365 : 252), ranking, fundamentals };
}

function payloadFor(items: Prepared[]) {
  return items.map(({ asset, news, outlook, odds, ranking, fundamentals }) => ({
    key: asset.key,
    name: asset.name,
    symbol: asset.symbol,
    type: asset.asset_type,
    moves: { today: pct1(asset.change_1d), week: pct1(asset.change_7d), month: pct1(asset.change_30d), three_months: pct1(asset.change_90d) },
    risk: asset.risk_label,
    trend_reading: { label: outlook.label, meaning: outlook.comment, what_to_watch: outlook.turn_watch },
    history: odds.condition
      ? { similar_cases: odds.condition, episodes: odds.episodes, days_ahead: odds.horizon, share_that_were_higher_afterwards: odds.share_up === null ? null : `${Math.round(odds.share_up * 100)}%`, typical_change: odds.median === null ? null : `${(odds.median * 100).toFixed(1)}%`, reliable: odds.reliable, for_comparison_any_day_share_higher: odds.base_share_up === null ? null : `${Math.round(odds.base_share_up * 100)}%` }
      : { similar_cases: "none stood out", reliable: false },
    company_results: fundamentals ? { ...fundamentalsForPrompt(fundamentals), price_and_business_disagree: priceVsBusiness(fundamentals, asset.change_30d) } : "not available for this kind of asset",
    strengths: ranking?.strengths.slice(0, 3) ?? [],
    concerns: ranking?.concerns.slice(0, 3) ?? [],
    headlines: news.slice(0, 6).map((item, index) => ({ n: index + 1, title: item.title, publisher: item.publisher, published: item.published?.slice(0, 10) ?? null })),
  }));
}

/** Asks for notes and outlooks for a batch of assets, and keeps only text that passes the safeguards. */
export async function writeBatch(items: Prepared[]): Promise<Map<string, { note: string; outlook: string }>> {
  const payload = payloadFor(items);
  const dataText = JSON.stringify(payload);
  const text = await callAnthropic(`${RULES}\n\nDATA:\n${dataText}`, 3600);
  const json = extractJsonObject(text);
  const out = new Map<string, { note: string; outlook: string }>();
  if (!json) return out;
  const parsed = JSON.parse(json) as Record<string, { note?: string; outlook?: string }>;
  for (const [key, value] of Object.entries(parsed)) {
    const ok = (s: string | undefined) => {
      if (!s || s.trim().length <= 20) return false;
      const why = BANNED.test(s) ? `banned wording "${s.match(BANNED)?.[0]}"` : DASHES.test(s) ? "dash" : !numbersGrounded(s, dataText) ? "a figure not in the data" : null;
      if (why) console.warn(`View text for ${key} rejected: ${why}`);
      return why === null;
    };
    out.set(key, { note: ok(value.note) ? (value.note as string).trim() : "", outlook: ok(value.outlook) ? (value.outlook as string).trim() : "" });
  }
  return out;
}

const asView = (row: Record<string, unknown>): ViewRecord => ({
  asset_key: String(row.asset_key),
  note: String(row.note ?? ""),
  outlook_text: String(row.outlook_text ?? ""),
  state: String(row.state ?? "unknown"),
  odds: (row.odds as Odds | null) ?? null,
  news: (row.news as ViewRecord["news"]) ?? [],
  updated_at: String(row.updated_at),
});

function viewError(message: string): Error {
  return new Error(/phrenos_market_views/.test(message) ? "The views table is missing. Run supabase/migrations/013_market_views.sql in Supabase." : message);
}

export async function getView(key: string): Promise<ViewRecord | null> {
  const { data, error } = await createServiceRoleClient().from(T.views).select("*").eq("asset_key", key).maybeSingle();
  if (error) {
    // A missing table should not break the asset page; the refresh button explains what to run.
    if (/phrenos_market_views/.test(error.message)) return null;
    throw viewError(error.message);
  }
  return data ? asView(data) : null;
}

/** Rewrites the research note and outlook for these assets from the latest prices and headlines, and saves them. */
export async function refreshViews(keys: string[]): Promise<{ written: number; failed: number }> {
  if (!isAnthropicConfigured()) throw new Error("ANTHROPIC_API_KEY is not set, so the research view cannot be written.");
  const unique = [...new Set(keys)];
  const prepared: Prepared[] = [];
  let failed = 0;
  for (let index = 0; index < unique.length; index += 4) {
    const chunk = await Promise.all(unique.slice(index, index + 4).map((key) => prepare(key).catch((error) => { console.warn(`View: could not prepare ${key}:`, error); failed += 1; return null; })));
    prepared.push(...chunk.filter((entry): entry is Prepared => entry !== null));
  }

  const db = createServiceRoleClient();
  let written = 0;
  for (let index = 0; index < prepared.length; index += 4) {
    const batch = prepared.slice(index, index + 4);
    let result = new Map<string, { note: string; outlook: string }>();
    try {
      result = await writeBatch(batch);
    } catch (error) {
      console.warn("View: the AI step failed:", error);
    }
    const rows = batch.map(({ asset, news, outlook, odds }) => {
      const text = result.get(asset.key);
      return {
        asset_key: asset.key,
        note: text?.note ?? "",
        // If the written outlook was rejected, say what the price pattern says in plain words rather than nothing.
        outlook_text: text?.outlook || outlook.comment,
        state: outlook.state,
        odds,
        news: news.slice(0, 6).map((item) => ({ title: item.title, publisher: item.publisher, link: item.link, published: item.published })),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await db.from(T.views).upsert(rows, { onConflict: "asset_key" });
    if (error) throw viewError(error.message);
    written += rows.length;
  }
  return { written, failed };
}

/** What the daily run refreshes: what you hold and watch. */
export async function viewTargets(): Promise<string[]> {
  const [holdings, watch] = await Promise.all([listHoldings("open"), listWatchlist()]);
  return [...new Set([...holdings.map((h) => h.asset_key), ...watch.map((w) => String(w.asset_key))])].slice(0, 30);
}
