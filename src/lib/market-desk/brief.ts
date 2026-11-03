import { callAnthropic, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { refreshEvents, listEvents } from "@/lib/market-desk/events";
import { collectLaunches, listLaunches } from "@/lib/market-desk/launches";
import { sendEmail, siteOrigin } from "@/lib/market-desk/notify";
import { sendPush } from "@/lib/market-desk/push";
import { collectSignals, findConfluence, listSignals, scoreSignals, trackRecord } from "@/lib/market-desk/signals";
import { getSettings, listHoldings, listWatchlist, T } from "@/lib/market-desk/store";
import { scanCrypto, scanCurrencies, scanStocksEtfsCommodities } from "@/lib/market-desk/universe";
import type { CryptoLeader, Leader } from "@/lib/market-desk/universe";

export type BriefIdea = {
  asset_key: string;
  symbol: string;
  name: string;
  type: string;
  risk_label: string;
  horizon: string;
  thesis: string;
  evidence: string[];
  risks: string[];
  would_change_my_mind: string;
  confidence: string;
};

export type BriefSections = {
  summary: string[];
  central_banks: string;
  week_ahead: { when: string; what: string; why_it_matters: string }[];
  currencies: string;
  commodities: string;
  stocks: string;
  crypto: string;
  smart_money: string;
  launches: string;
  ideas: BriefIdea[];
  avoid_or_caution: { symbol: string; why: string }[];
  limits: string;
  leaders: {
    stocks_top: Leader[];
    stocks_bottom: Leader[];
    etfs: Leader[];
    commodities: Leader[];
    currencies: { code: string; change_30d: number; change_90d: number; strength: number }[];
    crypto_top: CryptoLeader[];
    crypto_bottom: CryptoLeader[];
  };
};

export function mondayOf(date = new Date()): string {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}

const pct = (value: number | null) => (value === null ? null : Number((value * 100).toFixed(1)));

function compactLeader(leader: Leader) {
  return {
    key: leader.key,
    symbol: leader.symbol,
    name: leader.name,
    type: leader.type,
    change_30d_pct: pct(leader.change_30d),
    change_90d_pct: pct(leader.change_90d),
    vs_200d_avg_pct: pct(leader.vs_sma200),
    risk: `${leader.risk_label} (${leader.risk_score}/100)`,
  };
}

function compactCrypto(coin: CryptoLeader) {
  return {
    key: coin.key,
    symbol: coin.symbol,
    name: coin.name,
    market_cap_rank: coin.rank,
    change_7d_pct: pct(coin.change_7d),
    change_30d_pct: pct(coin.change_30d),
    change_200d_pct: pct(coin.change_200d),
    risk: coin.rank !== null && coin.rank <= 5 ? "High" : "Very high",
  };
}

const PROMPT_RULES = `You are the research analyst behind a private market dashboard for one person who invests in stocks, ETFs, bonds, crypto, currencies and commodities (GBP and EUR). Write her weekly brief.

RULES (all mandatory):
- This is research, not financial advice. Never tell her to buy, sell or hold anything. Never give amounts to invest, price targets or promised returns. Describe what the evidence shows, what supports it, what argues against it, and what would change the view.
- Use ONLY facts and numbers that appear in the DATA block. Never invent a price, percentage, date, event or quote. If the data does not say it, do not say it.
- When you mention a forecast and a previous figure from the calendar, copy both exactly as given and say which is higher or lower only after checking the two numbers. Never round, reorder or reinterpret them.
- The brief covers the week commencing WEEK_START. Use that date in the title, not today's date.
- Separate the facts (what the data shows) from interpretation (what it might mean). Label interpretation as such ("this may suggest", "one reading is").
- When DATA includes signal_track_record_so_far, quote it honestly: with few observations it proves nothing, and say so. Signals that agree across different kinds (signals_that_agree) are stronger than a single signal, but still not proof.
- Be even-handed. Every idea must carry real risks and counter-evidence. Confidence is "low", "medium" or "high" and is high only when several independent signals agree. Smart-money signals (insider trades, large transfers) are weak on their own: say so.
- Cover the whole risk scale. Include at least 2 lower-risk ideas, 2 moderate and 2 high or very high risk ideas, and say plainly why each sits where it does.
- New tokens and newly listed companies are always very high risk. Never present one as an idea. Mention them only as things to be aware of, with the warning signs.
- Ideas must come from the candidate lists in DATA (use the exact "key"). Give each a horizon: "days", "weeks", "months" or "years".
- Plain British English. No jargon without a short explanation. No em dashes or en dashes. Short sentences.

Return ONLY one JSON object:
{
 "title": "short title for the week",
 "summary": ["5 to 7 bullets: what matters most this week"],
 "central_banks": "2 short paragraphs on what the central banks announced or signalled and what it may mean for currencies, bonds, stocks and crypto",
 "week_ahead": [{"when":"day and date","what":"event","why_it_matters":"one sentence"}],
 "currencies": "which currencies are strongest and weakest and why",
 "commodities": "gold, silver, copper and the others: what is moving and why",
 "stocks": "which stocks and ETFs show the strongest and weakest momentum, and the broad picture",
 "crypto": "the crypto picture, strongest and weakest, and the risks",
 "smart_money": "what the insider and large-transfer signals show, with their limits",
 "launches": "what is new (tokens, IPOs, currencies) and the warning signs",
 "ideas": [{"asset_key":"","symbol":"","name":"","type":"","risk_label":"","horizon":"","thesis":"","evidence":["facts from DATA"],"risks":["real counter-points"],"would_change_my_mind":"","confidence":"low|medium|high"}],
 "avoid_or_caution": [{"symbol":"","why":""}],
 "limits": "one honest sentence on what this analysis cannot know"
}`;

/** Gathers everything, asks Claude to write the brief, and saves it. Roughly one AI call per week, so credits stay low. */
export async function generateWeeklyBrief(): Promise<{ id: string; week_start: string }> {
  await refreshEvents({ includeNews: true }).catch((error) => console.warn("Events refresh failed:", error));

  const [scan, currencies, crypto, holdings, watch] = await Promise.all([
    scanStocksEtfsCommodities(),
    scanCurrencies().catch(() => []),
    scanCrypto().catch(() => [] as CryptoLeader[]),
    listHoldings("open").catch(() => []),
    listWatchlist().catch(() => []),
  ]);

  const stocks = scan.filter((leader) => leader.type === "stock").sort((a, b) => b.strength - a.strength);
  const etfs = scan.filter((leader) => leader.type === "etf" || leader.type === "bond").sort((a, b) => b.strength - a.strength);
  const commodities = scan.filter((leader) => leader.type === "commodity").sort((a, b) => b.strength - a.strength);

  const usTickers = [
    ...stocks.filter((stock) => !stock.symbol.includes(".")).slice(0, 12).map((stock) => ({ ticker: stock.symbol, key: stock.key })),
    ...holdings.filter((holding) => holding.asset_type === "stock" && !holding.symbol.includes(".")).map((holding) => ({ ticker: holding.symbol, key: holding.asset_key })),
    ...watch.filter((item) => item.asset_type === "stock" && !String(item.symbol).includes(".")).map((item) => ({ ticker: String(item.symbol), key: String(item.asset_key) })),
  ].filter((entry, index, all) => all.findIndex((other) => other.ticker === entry.ticker) === index);

  await scoreSignals().catch((error) => console.warn("Scoring old signals failed:", error));
  await collectSignals({ crypto, usTickers }).catch((error) => console.warn("Signals failed:", error));
  await collectLaunches().catch((error) => console.warn("Launches failed:", error));

  const [events, signals, launches, record] = await Promise.all([listEvents(60), listSignals(60), listLaunches(20), trackRecord().catch(() => [])]);
  const agreeing = findConfluence(signals);
  const soon = Date.now() - 7 * 86400000;
  const data = {
    today: new Date().toISOString().slice(0, 10),
    announcements_and_calendar: events
      .filter((event) => event.event_date && new Date(String(event.event_date)).getTime() >= soon)
      .slice(0, 40)
      .map((event) => ({ date: String(event.event_date).slice(0, 10), kind: event.kind, region: event.region, impact: event.impact, title: event.title, detail: event.summary })),
    currency_strength_vs_group: currencies.map((item) => ({ currency: item.code, change_30d_pct: pct(item.change_30d), change_90d_pct: pct(item.change_90d) })),
    commodities: commodities.map(compactLeader),
    stocks_strongest: stocks.slice(0, 12).map(compactLeader),
    stocks_weakest: stocks.slice(-6).map(compactLeader),
    etfs_and_bonds: etfs.map(compactLeader),
    crypto_strongest: crypto.slice(0, 8).map(compactCrypto),
    crypto_weakest: crypto.slice(-5).map(compactCrypto),
    signals_that_agree: agreeing.map((item) => ({ symbol: item.symbol, direction: item.direction, signal_types: item.types })),
    signal_track_record_so_far: record.map((item) => ({ signal: item.signal_type, direction: item.direction, times_seen: item.n, share_where_price_moved_that_way_pct: Number((item.hit_rate * 100).toFixed(0)), average_move_pct: Number((item.avg_move * 100).toFixed(1)), average_days_since: Math.round(item.avg_days) })),
    smart_money_signals: signals.slice(0, 30).map((signal) => ({ symbol: signal.symbol, type: signal.signal_type, direction: signal.direction, strength_1_to_5: signal.strength, summary: signal.summary })),
    new_launches: launches.map((launch) => ({ kind: launch.kind, name: launch.name, symbol: launch.symbol, risk_level: launch.risk_level, warning_signs: launch.risk_flags })),
  };

  const weekStart = mondayOf();
  const text = await callAnthropic(`${PROMPT_RULES.replace("WEEK_START", weekStart)}\n\nDATA:\n${JSON.stringify(data)}`, 9000);
  const json = extractJsonObject(text);
  if (!json) throw new Error("The brief came back in an unreadable format.");
  const draft = JSON.parse(json) as Partial<BriefSections> & { title?: string };

  // Ideas can only be assets that were actually scanned, and their risk label comes from the data, not the model.
  const known = new Map<string, { risk: string; name: string; type: string; symbol: string }>();
  for (const leader of scan) known.set(leader.key, { risk: leader.risk_label, name: leader.name, type: leader.type, symbol: leader.symbol });
  for (const coin of crypto) known.set(coin.key, { risk: coin.rank !== null && coin.rank <= 5 ? "High" : "Very high", name: coin.name, type: "crypto", symbol: coin.symbol });
  const ideas = (draft.ideas ?? [])
    .filter((idea) => known.has(idea.asset_key))
    .map((idea) => {
      const fact = known.get(idea.asset_key)!;
      return { ...idea, symbol: fact.symbol, name: fact.name, type: fact.type, risk_label: fact.risk };
    });

  const sections: BriefSections = {
    summary: draft.summary ?? [],
    central_banks: draft.central_banks ?? "",
    week_ahead: draft.week_ahead ?? [],
    currencies: draft.currencies ?? "",
    commodities: draft.commodities ?? "",
    stocks: draft.stocks ?? "",
    crypto: draft.crypto ?? "",
    smart_money: draft.smart_money ?? "",
    launches: draft.launches ?? "",
    ideas,
    avoid_or_caution: draft.avoid_or_caution ?? [],
    limits: draft.limits ?? "No analysis can predict the market, and past moves do not guarantee future ones.",
    leaders: {
      stocks_top: stocks.slice(0, 8),
      stocks_bottom: stocks.slice(-5).reverse(),
      etfs,
      commodities,
      currencies,
      crypto_top: crypto.slice(0, 8),
      crypto_bottom: crypto.slice(-5).reverse(),
    },
  };

  const { data: saved, error } = await createServiceRoleClient()
    .from(T.briefs)
    .upsert(
      {
        week_start: weekStart,
        status: "ready",
        title: draft.title ?? `Market brief, week of ${weekStart}`,
        summary_html: "",
        sections,
        sources: [],
        created_at: new Date().toISOString(),
      },
      { onConflict: "week_start" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const settings = await getSettings().catch(() => null);
  const link = `${siteOrigin()}/admin/market-desk`;
  if (settings?.alert_email) {
    await sendEmail(
      settings.alert_email,
      "Your weekly Market Desk brief is ready",
      `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;"><h1 style="font-size:22px;color:#101c14;">${draft.title ?? "Weekly market brief"}</h1><ul style="color:#4a5248;line-height:1.55;">${(draft.summary ?? []).map((line) => `<li>${line.replace(/</g, "&lt;")}</li>`).join("")}</ul><p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#101c14;color:#f1e8d6;text-decoration:none;border-radius:999px;">Read the full brief</a></p><p style="font-size:12px;color:#7a8278;">Research, not financial advice.</p></div>`,
    );
  }
  await sendPush({ title: "Market Desk", body: "Your weekly market brief is ready." }).catch(() => 0);

  return { id: String(saved.id), week_start: weekStart };
}

export async function latestBrief() {
  const { data, error } = await createServiceRoleClient()
    .from(T.briefs)
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
