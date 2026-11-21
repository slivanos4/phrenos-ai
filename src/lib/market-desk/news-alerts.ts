import { callAnthropic, extractJsonObject, isAnthropicConfigured } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { fetchNews, type NewsItem } from "@/lib/market-desk/news";
import { alertEmail, sendEmail } from "@/lib/market-desk/notify";
import { numbersGrounded } from "@/lib/market-desk/pulse";
import { DEFAULT_THRESHOLDS } from "@/lib/market-desk/alerts";
import { listRankings } from "@/lib/market-desk/rankings";
import { getAssets, getSettings, listHoldings, listWatchlist, T } from "@/lib/market-desk/store";
import type { AlertRow, AssetRow } from "@/lib/market-desk/types";

/**
 * Warns you about important news on what you hold or watch. A headline is only a candidate if it is recent and either sounds serious
 * (an investigation, a lawsuit, a hack, a collapse, a ban) or the price has moved sharply today. Candidates are then judged by AI from the
 * headline alone, and the warning says in plain words why it matters. Each story warns once.
 */
const SERIOUS = /\b(investigat\w*|probe[ds]?|sec\b|subpoena\w*|fraud\w*|lawsuit\w*|sued?|class action|bankrupt\w*|insolven\w*|delist\w*|halt(ed|s)?|suspend\w*|hack(ed|s|ers)?|exploit\w*|breach\w*|stolen|restat\w*|accounting|recall\w*|ban(ned|s)?|sanction\w*|resign\w*|steps? down|ousted|fired|plunge[sd]?|plummet\w*|crash\w*|collapse[sd]?|downgrad\w*|warning|warns?|guidance cut|cuts? (guidance|outlook|forecast)|miss(es|ed)? (estimates|expectations)|default\w*|rout)\b/i;
const SEVERE = /\b(investigat\w*|fraud\w*|bankrupt\w*|insolven\w*|delist\w*|halt(ed|s)?|hack(ed|s)?|exploit\w*|restat\w*|subpoena\w*|collapse[sd]?|default\w*)\b/i;
const FRESH_HOURS = 40;

export type NewsAlertDraft = Pick<AlertRow, "kind" | "severity" | "title" | "message"> & { holding_id: string | null; asset_key: string | null; data: Record<string, unknown> };

type Candidate = { asset: AssetRow; holdingId: string | null; items: NewsItem[]; bigMove: boolean; major: boolean };

/** How many of the largest assets in the rankings are watched for market-moving news even if you do not hold them. */
const MAJORS = 25;

const BANNED = /\b(buy|sell|hold|should (invest|buy|sell)|price target|will (rise|fall|reach|hit|crash|recover))\b/i;

async function judge(candidates: Candidate[]): Promise<Map<string, { important: boolean; summary: string; source: number }>> {
  const payload = candidates.map(({ asset, items, bigMove }) => ({
    key: asset.key,
    name: asset.name,
    price_move_today: asset.change_1d === null ? null : `${asset.change_1d >= 0 ? "up" : "down"} ${Math.abs(asset.change_1d * 100).toFixed(1)}%`,
    big_move_today: bigMove,
    headlines: items.slice(0, 5).map((item, index) => ({ n: index + 1, title: item.title, publisher: item.publisher, published: item.published?.slice(0, 16) ?? null })),
  }));
  const dataText = JSON.stringify(payload);
  const text = await callAnthropic(
    `You screen news for a private market dashboard. For each asset, decide whether any numbered headline is MATERIAL to its price today: an investigation or legal action, accounting or fraud concerns, a major product or contract change, a leadership exit, a hack, a ban or sanction, a results surprise, a collapse, a major analyst or rating change. Ignore opinion pieces, "should you buy" articles, dividend or yield stories, listicles and anything that is only about a different company.

For each asset return {"important": boolean, "source": the n of the single most important headline, "summary": one plain sentence (at most 35 words) saying what happened and why it could matter for the price}. Use ONLY facts in the headlines and data given. Do not predict the price. Never say buy, sell or hold. British English. No dash characters.

Return ONLY a JSON object mapping each asset "key" to that object.

DATA:\n${dataText}`,
    2500,
  );
  const json = extractJsonObject(text);
  const out = new Map<string, { important: boolean; summary: string; source: number }>();
  if (!json) return out;
  for (const [key, value] of Object.entries(JSON.parse(json) as Record<string, { important?: boolean; summary?: string; source?: number }>)) {
    const summary = (value.summary ?? "").trim();
    const valid = value.important === true && typeof value.source === "number" && summary.length > 15 && !BANNED.test(summary) && !/[–—]/.test(summary) && numbersGrounded(summary, dataText);
    out.set(key, { important: valid, summary, source: value.source ?? 1 });
  }
  return out;
}

export type NewsCheckSummary = { checked: number; candidates: number; alerts: number; emailed: boolean; drafts?: NewsAlertDraft[] };

/** Looks for important news on everything you hold or watch. With dryRun it only reports what it would warn about. */
export async function runNewsCheck(options: { dryRun?: boolean } = {}): Promise<NewsCheckSummary> {
  const db = createServiceRoleClient();
  const [holdings, watch, settings] = await Promise.all([listHoldings("open"), listWatchlist(), getSettings()]);
  const holdingByKey = new Map(holdings.map((holding) => [holding.asset_key, holding.id]));
  const personal = [...new Set([...holdings.map((h) => h.asset_key), ...watch.map((w) => String(w.asset_key))])];
  const ranked = await listRankings().catch(() => []);
  const majorRows = [...ranked].sort((a, b) => (b.market_cap_gbp ?? 0) - (a.market_cap_gbp ?? 0)).filter((row) => !personal.includes(row.key)).slice(0, MAJORS);
  const keys = [...personal, ...majorRows.map((row) => row.key)];
  const summary: NewsCheckSummary = { checked: keys.length, candidates: 0, alerts: 0, emailed: false };
  if (keys.length === 0) return summary;

  const assets = await getAssets(personal);
  // The largest assets are not stored as tracked assets, so a plain record is built from the rankings scan.
  for (const row of majorRows) {
    assets.set(row.key, {
      key: row.key, provider: row.key.split(":")[0], symbol: row.symbol, name: row.name, asset_type: row.asset_type, currency: row.currency,
      price: row.price, price_gbp: row.price_gbp, price_eur: null, change_1d: row.change_1d, change_7d: row.change_7d, change_30d: row.change_30d, change_90d: row.change_90d,
      vol_30d: null, vol_90d: null, drawdown_1y: row.drawdown_1y, sma50: null, sma200: null, risk_score: row.risk_score, risk_label: row.risk_label as AssetRow["risk_label"],
      risk_reasons: [], prev_risk_score: null, history: row.history, updated_at: row.updated_at,
    });
  }
  const majorKeys = new Set(majorRows.map((row) => row.key));
  const thresholds = { ...DEFAULT_THRESHOLDS, ...settings.thresholds };
  const since = Date.now() - FRESH_HOURS * 3_600_000;

  const candidates: Candidate[] = [];
  for (const key of keys) {
    const asset = assets.get(key);
    if (!asset) continue;
    const items = await fetchNews(asset).catch(() => [] as NewsItem[]);
    const fresh = items.filter((item) => item.published && new Date(item.published).getTime() >= since);
    const limit = (thresholds[`day_${asset.asset_type}`] ?? 8) / 100;
    const bigMove = asset.change_1d !== null && Math.abs(asset.change_1d) >= limit;
    // Serious wording on its own is enough. A big move makes the newest headlines worth a look even without those words.
    const relevant = fresh.filter((item) => SERIOUS.test(item.title));
    const major = majorKeys.has(key);
    // For assets you do not hold or watch, only serious wording together with a big move is worth interrupting you for.
    const chosen = major ? (bigMove ? relevant : []) : relevant.length > 0 ? relevant : bigMove ? fresh.slice(0, 4) : [];
    if (chosen.length > 0) candidates.push({ asset, holdingId: holdingByKey.get(key) ?? null, items: chosen, bigMove, major });
  }
  summary.candidates = candidates.length;
  if (candidates.length === 0) return summary;

  const verdicts = new Map<string, { important: boolean; summary: string; source: number }>();
  if (isAnthropicConfigured()) {
    for (let index = 0; index < candidates.length; index += 6) {
      try {
        for (const [key, value] of await judge(candidates.slice(index, index + 6))) verdicts.set(key, value);
      } catch (error) {
        console.warn("News check: the AI step failed, using headline wording only:", error);
      }
    }
  }

  const { data: seenRows } = await db.from(T.alerts).select("data").eq("kind", "news").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
  const seen = new Set((seenRows ?? []).map((row) => String((row.data as { source_url?: string })?.source_url ?? "")));

  const drafts: NewsAlertDraft[] = [];
  for (const { asset, holdingId, items, bigMove, major } of candidates) {
    const verdict = verdicts.get(asset.key);
    // With the AI step working, only what it judged material is sent. If it is down, serious wording alone is trusted.
    if (verdicts.size > 0 && !verdict?.important) continue;
    const item = verdict ? (items[verdict.source - 1] ?? items[0]) : items[0];
    if (seen.has(item.link)) continue;
    const severe = SEVERE.test(item.title);
    const summaryText = verdict?.summary || item.title;
    const move = asset.change_1d === null || Math.abs(asset.change_1d) < 0.03 ? "" : ` Its price is ${asset.change_1d >= 0 ? "up" : "down"} ${Math.abs(asset.change_1d * 100).toFixed(1)}% today.`;
    drafts.push({
      holding_id: holdingId,
      asset_key: asset.key,
      kind: "news",
      severity: severe || bigMove ? "critical" : "warning",
      title: `News on ${asset.name || asset.symbol}: ${item.title.length > 110 ? `${item.title.slice(0, 107)}...` : item.title}`,
      message: `${major ? "Market-wide: you do not hold or watch this, but it is one of the largest assets. " : ""}${summaryText}${move} Source: ${item.publisher || "news"}. Check the story before acting: headlines can be wrong, and a price can move either way.`,
      data: { source_url: item.link, headline: item.title, publisher: item.publisher, published: item.published, held: holdingId !== null, market_wide: major },
    });
    seen.add(item.link);
  }

  summary.alerts = drafts.length;
  if (options.dryRun) return { ...summary, drafts };
  if (drafts.length === 0) return summary;

  const { data: inserted, error } = await db.from(T.alerts).insert(drafts).select("*");
  if (error) throw new Error(error.message);
  const rows = (inserted ?? []) as AlertRow[];
  if (settings.alert_email) {
    const mail = alertEmail(rows);
    summary.emailed = await sendEmail(settings.alert_email, mail.subject, mail.html);
    if (summary.emailed) await db.from(T.alerts).update({ emailed_at: new Date().toISOString() }).in("id", rows.map((row) => row.id));
  }
  const { pushAlerts } = await import("@/lib/market-desk/push");
  await pushAlerts(rows);
  return summary;
}
