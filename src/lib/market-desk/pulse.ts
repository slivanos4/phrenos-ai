import { callAnthropic, extractJsonObject, isAnthropicConfigured } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { fetchNews, type NewsItem } from "@/lib/market-desk/detail";
import { listHoldings, listWatchlist, refreshAsset, T } from "@/lib/market-desk/store";
import type { AssetRow } from "@/lib/market-desk/types";

/**
 * A short daily summary per asset, in the spirit of a "Pulse" feed: what the price did, and what the news says, with a link
 * for every claim. The price line is worked out in code from the numbers, never by the AI. The AI only writes bullets about
 * headlines it was given, and any bullet that mentions a figure not in the data, or sounds like advice, is thrown away.
 */
export type PulseBullet = { text: string; source_title: string | null; source_url: string | null };
export type Pulse = {
  id: string;
  asset_key: string;
  day: string;
  headline: string;
  bullets: PulseBullet[];
  move: { from: number; to: number; change: number; currency: string } | null;
  created_at: string;
};

const BANNED = /\b(buy|sell|hold|accumulate|should (invest|buy|sell)|price target|guaranteed?|will (rise|fall|reach|hit|crash|soar|double)|to the moon)\b/i;
const DASHES = /[–—]/;

/** Every number a bullet mentions must already appear in the data it was given. */
export function numbersGrounded(text: string, data: string): boolean {
  const tokens = text.match(/\d[\d,.]*\d|\d/g) ?? [];
  // Whole-number match, so a lone "5" is not accepted just because the data contains "15".
  return tokens.every((token) => new RegExp(`(?<![\\d.,])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(data));
}

const money = (value: number, currency: string) => {
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  const digits = value >= 100 ? 0 : value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
  return `${sym}${value.toLocaleString("en-GB", { maximumFractionDigits: digits })}${sym ? "" : ` ${currency}`}`;
};

/** The price line, from the stored daily closes. */
export function moveBullet(asset: AssetRow): { text: string; move: Pulse["move"] } | null {
  const history = asset.history;
  if (!history || history.length < 2 || asset.change_1d === null || asset.price === null) return null;
  const to = asset.price;
  const from = to / (1 + asset.change_1d);
  const direction = asset.change_1d > 0 ? "Up" : asset.change_1d < 0 ? "Down" : "Unchanged";
  const size = Math.abs(asset.change_1d * 100).toFixed(1);
  const longer = [["7 days", asset.change_7d], ["30 days", asset.change_30d]]
    .filter(([, value]) => value !== null)
    .map(([label, value]) => `${(value as number) >= 0 ? "up" : "down"} ${Math.abs((value as number) * 100).toFixed(1)}% over ${label}`)
    .join(", ");
  const text = `${direction} ${size}% over the last day, from ${money(from, asset.currency)} to ${money(to, asset.currency)}${longer ? `. Over a longer view it is ${longer}` : ""}.`;
  return { text, move: { from, to, change: asset.change_1d, currency: asset.currency } };
}

type Written = { headline?: string; bullets?: { text?: string; source?: number | null }[] };

const RULES = `You write a short daily "Pulse" for each asset on a private research dashboard. For each asset you are given its recent price moves and a numbered list of recent news headlines.

Write for each asset:
- "headline": one plain sentence, at most 16 words, saying the main thing to know today.
- "bullets": at most 2 bullets, each one sentence, each about ONE of the numbered headlines. Set "source" to that headline's number. Do not write a bullet that is not about a numbered headline.

RULES: This is research, not advice. Never say buy, sell, hold, or what to invest. No price targets, no predictions, no "will". Use ONLY facts and numbers that appear in the data given, and never add background from your own knowledge. Stay close to each headline's own wording: do not add dramatic words such as scandal, crisis, surge or plunge unless the headline uses them. If no headline is relevant, return an empty bullets list and say in the headline that nothing notable was reported. British English. Do not use any dash characters such as em dashes or en dashes.

Return ONLY a JSON object mapping each asset "key" to {"headline": string, "bullets": [{"text": string, "source": number}]}.`;

export async function writeBatch(items: { asset: AssetRow; news: NewsItem[]; move: string | null }[]): Promise<Map<string, Written>> {
  const payload = items.map(({ asset, news, move }) => ({
    key: asset.key,
    name: asset.name,
    symbol: asset.symbol,
    type: asset.asset_type,
    price_move: move,
    risk: asset.risk_label,
    headlines: news.slice(0, 6).map((item, index) => ({ n: index + 1, title: item.title, publisher: item.publisher, published: item.published?.slice(0, 10) ?? null })),
  }));
  const text = await callAnthropic(`${RULES}\n\nDATA:\n${JSON.stringify(payload)}`, 4000);
  const json = extractJsonObject(text);
  const map = new Map<string, Written>();
  if (!json) return map;
  const parsed = JSON.parse(json) as Record<string, Written>;
  for (const [key, value] of Object.entries(parsed)) map.set(key, value);
  return map;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Works out and saves today's Pulse for each asset. Assets that already have one today are skipped unless forced. */
export async function generatePulses(keys: string[], options: { force?: boolean } = {}): Promise<{ written: number; skipped: number; failed: number }> {
  if (!isAnthropicConfigured()) throw new Error("ANTHROPIC_API_KEY is not set, so the Pulse cannot be written.");
  const db = createServiceRoleClient();
  const unique = [...new Set(keys)];
  let existing = new Set<string>();
  if (!options.force) {
    const { data } = await db.from(T.pulses).select("asset_key").eq("day", today()).in("asset_key", unique);
    existing = new Set((data ?? []).map((row) => String(row.asset_key)));
  }
  const todo = unique.filter((key) => !existing.has(key));
  let written = 0;
  let failed = 0;

  const prepared: { asset: AssetRow; news: NewsItem[]; move: ReturnType<typeof moveBullet> }[] = [];
  for (let index = 0; index < todo.length; index += 4) {
    const chunk = await Promise.all(todo.slice(index, index + 4).map(async (key) => {
      try {
        const { asset } = await refreshAsset(key);
        return { asset, news: await fetchNews(asset), move: moveBullet(asset) };
      } catch (error) {
        console.warn(`Pulse: could not prepare ${key}:`, error);
        failed += 1;
        return null;
      }
    }));
    prepared.push(...chunk.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
  }

  for (let index = 0; index < prepared.length; index += 6) {
    const batch = prepared.slice(index, index + 6);
    let result = new Map<string, Written>();
    try {
      result = await writeBatch(batch.map(({ asset, news, move }) => ({ asset, news, move: move?.text ?? null })));
    } catch (error) {
      console.warn("Pulse: the AI step failed, saving price lines only:", error);
    }
    const rows = batch.map(({ asset, news, move }) => {
      const written = result.get(asset.key);
      const dataText = JSON.stringify({ news: news.slice(0, 6).map((item) => item.title), move: move?.text });
      const bullets: PulseBullet[] = [];
      if (move) bullets.push({ text: move.text, source_title: null, source_url: null });
      for (const bullet of written?.bullets ?? []) {
        const text = (bullet.text ?? "").trim();
        const source = typeof bullet.source === "number" ? news.slice(0, 6)[bullet.source - 1] : undefined;
        if (!text || !source || BANNED.test(text) || DASHES.test(text) || !numbersGrounded(text, dataText)) continue;
        bullets.push({ text, source_title: source.title, source_url: source.link });
      }
      let headline = (written?.headline ?? "").trim();
      if (!headline || BANNED.test(headline) || DASHES.test(headline) || !numbersGrounded(headline, dataText)) {
        headline = bullets.length > 1 ? "Here is what the news said today." : "No notable news was reported.";
      }
      return { asset_key: asset.key, day: today(), headline, bullets, move: move?.move ?? null };
    });
    const { error } = await db.from(T.pulses).upsert(rows, { onConflict: "asset_key,day" });
    if (error) throw new Error(/phrenos_market_pulses/.test(error.message) ? "The Pulse table is missing. Run supabase/migrations/012_market_pulse_dashboards_api.sql in Supabase." : error.message);
    written += rows.length;
  }
  return { written, skipped: unique.length - todo.length, failed };
}

const asPulse = (row: Record<string, unknown>): Pulse => ({
  id: String(row.id),
  asset_key: String(row.asset_key),
  day: String(row.day),
  headline: String(row.headline ?? ""),
  bullets: (row.bullets as PulseBullet[]) ?? [],
  move: (row.move as Pulse["move"]) ?? null,
  created_at: String(row.created_at),
});

function pulseError(message: string): Error {
  return new Error(/phrenos_market_pulses/.test(message) ? "The Pulse table is missing. Run supabase/migrations/012_market_pulse_dashboards_api.sql in Supabase." : message);
}

export async function pulsesFor(key: string, limit = 7): Promise<Pulse[]> {
  const { data, error } = await createServiceRoleClient().from(T.pulses).select("*").eq("asset_key", key).order("day", { ascending: false }).limit(limit);
  if (error) throw pulseError(error.message);
  return (data ?? []).map(asPulse);
}

/** The newest Pulse for each of several assets. */
export async function latestPulses(keys: string[]): Promise<Map<string, Pulse>> {
  const out = new Map<string, Pulse>();
  if (keys.length === 0) return out;
  const { data, error } = await createServiceRoleClient().from(T.pulses).select("*").in("asset_key", keys).order("day", { ascending: false }).limit(keys.length * 3);
  if (error) throw pulseError(error.message);
  for (const row of data ?? []) if (!out.has(String(row.asset_key))) out.set(String(row.asset_key), asPulse(row));
  return out;
}

/** What the daily run covers: everything you hold, everything on the watchlist, and the top of the rankings. */
export async function pulseTargets(topRanked = 12): Promise<string[]> {
  const db = createServiceRoleClient();
  const [holdings, watch, top] = await Promise.all([
    listHoldings("open"),
    listWatchlist(),
    db.from(T.rankings).select("key").order("rank", { ascending: true }).limit(topRanked),
  ]);
  return [...new Set([...holdings.map((h) => h.asset_key), ...watch.map((w) => String(w.asset_key)), ...(top.data ?? []).map((row) => String(row.key))])].slice(0, 36);
}
