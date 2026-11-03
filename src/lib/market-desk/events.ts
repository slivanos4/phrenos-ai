import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { T } from "@/lib/market-desk/store";

const UA = "PhrenosMarketDesk/1.0 (contact@phrenosai.com)";

type Feed = { bank: string; region: string; url: string };

const CENTRAL_BANK_FEEDS: Feed[] = [
  { bank: "US Federal Reserve", region: "USD", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
  { bank: "European Central Bank", region: "EUR", url: "https://www.ecb.europa.eu/rss/press.xml" },
  { bank: "Bank of England", region: "GBP", url: "https://www.bankofengland.co.uk/rss/news" },
  { bank: "Bank of Japan", region: "JPY", url: "https://www.boj.or.jp/en/rss/whatsnew.xml" },
  { bank: "Reserve Bank of Australia", region: "AUD", url: "https://www.rba.gov.au/rss/rss-cb-media-releases.xml" },
  { bank: "Bank of Canada", region: "CAD", url: "https://www.bankofcanada.ca/content_type/press-releases/feed/" },
];

/** Words that make a central bank release market-moving, as opposed to speeches and routine notices. */
const HIGH_IMPACT = /(monetary policy|interest rate|policy rate|rate decision|bank rate|fomc|minutes|inflation report|financial stability|quantitative|asset purchase|digital (euro|pound)|stablecoin|crypto)/i;

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

export function parseFeed(xml: string): { title: string; link: string; date: string | null; summary: string }[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks.map((block) => {
    const link = tag(block, "link") || block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    const rawDate = tag(block, "pubDate") || tag(block, "dc:date") || tag(block, "updated") || tag(block, "published");
    const parsed = rawDate ? new Date(rawDate) : null;
    return {
      title: tag(block, "title"),
      link,
      date: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      summary: (tag(block, "description") || tag(block, "summary")).slice(0, 400),
    };
  });
}

type CalendarItem = { title: string; country: string; date: string; impact: string; forecast: string; previous: string };

export type EventRow = {
  kind: string;
  title: string;
  summary: string;
  region: string;
  impact: "low" | "medium" | "high";
  source_url: string;
  event_date: string | null;
};

async function centralBankEvents(): Promise<EventRow[]> {
  const cutoff = Date.now() - 21 * 86400000;
  const batches = await Promise.all(
    CENTRAL_BANK_FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (!response.ok) return [];
        return parseFeed(await response.text())
          .filter((item) => item.title && item.link && item.date && new Date(item.date).getTime() >= cutoff)
          .slice(0, 12)
          .map<EventRow>((item) => ({
            kind: "central_bank",
            title: `${feed.bank}: ${item.title}`,
            summary: item.summary,
            region: feed.region,
            impact: HIGH_IMPACT.test(`${item.title} ${item.summary}`) ? "high" : "low",
            source_url: item.link,
            event_date: item.date,
          }));
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}

/** This week's economic calendar (inflation, jobs, rate decisions) for the currencies that matter here. */
async function calendarEvents(): Promise<EventRow[]> {
  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const items = (await response.json()) as CalendarItem[];
    return items
      .filter((item) => ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "CNY"].includes(item.country) && item.impact !== "Holiday")
      .filter((item) => item.impact === "High" || item.impact === "Medium")
      .map<EventRow>((item) => {
        const detail = [item.forecast && `forecast ${item.forecast}`, item.previous && `previous ${item.previous}`].filter(Boolean).join(", ");
        return {
          kind: "economic",
          title: `${item.country}: ${item.title}`,
          summary: detail,
          region: item.country,
          impact: item.impact === "High" ? "high" : "medium",
          // The feed has no page per event, so each row links to the calendar. The fragment keeps rows distinct.
          source_url: `https://www.forexfactory.com/calendar#${encodeURIComponent(`${item.country}-${item.title}-${item.date}`)}`,
          event_date: new Date(item.date).toISOString(),
        };
      });
  } catch {
    return [];
  }
}

/** Crypto regulation and ETF decisions come from news search, since they have no calendar. */
async function newsEvents(): Promise<EventRow[]> {
  const { isExaConfigured, searchExaArticles } = await import("@/lib/phrenos-updates/exa-search").then((module) => ({
    searchExaArticles: module.searchExaArticles,
    isExaConfigured: () => Boolean(process.env.EXA_API_KEY?.trim()),
  }));
  if (!isExaConfigured()) return [];
  const end = new Date();
  const start = new Date(end.getTime() - 10 * 86400000);
  const lookback = { lookbackStart: start.toISOString(), lookbackEnd: end.toISOString() };
  const queries: { query: string; kind: string; region: string }[] = [
    { query: "crypto regulation announcement SEC FCA MiCA stablecoin law", kind: "crypto_regulation", region: "Global" },
    { query: "spot crypto ETF approval decision SEC filing", kind: "etf", region: "US" },
  ];
  const results = await Promise.all(queries.map((q) => searchExaArticles({ query: q.query, lookback, maxResults: 6 })));
  const rows: EventRow[] = [];
  results.forEach((result, index) => {
    for (const hit of result.sources) {
      if (!hit.url || !hit.title) continue;
      rows.push({
        kind: queries[index].kind,
        title: hit.title,
        summary: (hit.content ?? "").replace(/\s+/g, " ").slice(0, 300),
        region: queries[index].region,
        impact: "medium",
        source_url: hit.url,
        event_date: hit.published_date ? new Date(hit.published_date).toISOString() : null,
      });
    }
  });
  return rows;
}

/** Pulls announcements and the calendar into the events table. Free feeds only, so it is safe to run daily. */
export async function refreshEvents(options: { includeNews?: boolean } = {}): Promise<number> {
  const [banks, calendar, news] = await Promise.all([
    centralBankEvents(),
    calendarEvents(),
    options.includeNews ? newsEvents() : Promise.resolve([] as EventRow[]),
  ]);
  const rows = [...banks, ...calendar, ...news];
  if (rows.length === 0) return 0;
  const { error } = await createServiceRoleClient().from(T.events).upsert(rows, { onConflict: "source_url" });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function listEvents(limit = 80) {
  const since = new Date(Date.now() - 21 * 86400000).toISOString();
  const { data, error } = await createServiceRoleClient()
    .from(T.events)
    .select("*")
    .gte("event_date", since)
    .order("event_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** High-impact events in the next day, which become "event risk" notices. */
export async function upcomingHighImpact(hours = 30) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3600000);
  const { data } = await createServiceRoleClient()
    .from(T.events)
    .select("*")
    .eq("impact", "high")
    .gte("event_date", now.toISOString())
    .lte("event_date", until.toISOString());
  return data ?? [];
}
