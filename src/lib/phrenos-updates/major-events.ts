import { callAnthropicSafe, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { domainNewsBoost } from "@/lib/phrenos-updates/research-discovery";
import type { GeneratedSource, ResearchSection } from "@/lib/phrenos-updates/types";
import { SECTION_LABELS } from "@/lib/phrenos-updates/types";

export type MajorEvent = {
  label: string;
  importance: "major" | "notable";
  urls: string[];
};

/** Most distinct "major" developments we will force into a section. */
export const MAX_MAJOR_EVENTS = 5;

/** Stock commentary and aggregator pages: rarely the right primary source for a story. */
const LOW_SIGNAL_DOMAINS = [
  "zacks.com",
  "tradingview.com",
  "simplywall.st",
  "fool.com",
  "marketbeat.com",
  "investing.com",
  "finance.yahoo.com",
  "benzinga.com",
  "medium.com",
];

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeUrlKey(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function signalScore(source: GeneratedSource): number {
  const h = host(source.url);
  const lowSignal = LOW_SIGNAL_DOMAINS.some((domain) => h === domain || h.endsWith(`.${domain}`));
  const published = source.published_at ? Date.parse(source.published_at) : 0;
  const recency = Number.isFinite(published) ? published / 86_400_000 / 1000 : 0;
  return domainNewsBoost(source.url) - (lowSignal ? 3 : 0) + recency;
}

/** Quality-rank articles that are not tied to an identified event. */
export function rankByQuality(pool: GeneratedSource[]): GeneratedSource[] {
  return [...pool].sort((a, b) => signalScore(b) - signalScore(a));
}

/**
 * Read the WHOLE pool (titles only, cheap) and identify the distinct developments in it.
 * A launch from a leading company, a major regulatory or security event, or anything several
 * independent outlets cover is marked "major" so curation cannot overlook it.
 */
export async function identifyMajorEvents(
  section: ResearchSection,
  pool: GeneratedSource[],
  input: { lookbackStart: string; lookbackEnd: string }
): Promise<MajorEvent[]> {
  const items = rankByQuality(pool.filter((source) => !source.is_synthesis && source.url)).slice(0, 100);
  if (items.length < 2) return [];

  const lines = items
    .map((source, index) => {
      const date = (source.published_at ?? "").slice(0, 10);
      const snippet = source.excerpt.replace(/\s+/g, " ").slice(0, 150);
      return `${index + 1}. [${host(source.url)}] ${source.title} (${date}) :: ${snippet}`;
    })
    .join("\n");

  const prompt = `You are the news editor for Phrenos.ai's weekly Gen AI brief. Period: ${input.lookbackStart} to ${input.lookbackEnd}. Section: ${SECTION_LABELS[section]}.

Below are ALL candidate articles found for this section. Group them into the distinct real-world developments they report on, and rate how important each development is.

"major" means any of:
- a product, model, platform or agent launch or announcement from a leading company (OpenAI, Anthropic, Google or DeepMind, Microsoft, Meta, Nvidia, Amazon or AWS, Apple, xAI, Mistral, DeepSeek and similar)
- a significant regulatory, legal or government action
- a significant safety, security or reliability incident
- a major funding round, IPO, acquisition or partnership
- anything covered by several independent outlets
"notable" means interesting but narrower or covered by only one or two outlets.

Rules:
- A launch from a leading company, or anything covered by several outlets, must be rated "major". Do not let weak source quality hide a major event: judge the event, not the article.
- Ignore stock-price commentary, listicles, SEO explainers and small-vendor press releases unless widely covered.
- Each article number may belong to at most one event. Use only numbers from the list.
- Return at most 10 events, most important first. Do not invent events that the articles do not report.

Articles:
${lines}

Return ONLY JSON: {"events":[{"label":"short plain description of the development","importance":"major","articles":[1,4,9]}]}`;

  const text = await callAnthropicSafe(prompt, 3500);
  const json = text ? extractJsonObject(text) : null;
  if (!json) return [];

  try {
    const parsed = JSON.parse(json) as {
      events?: { label?: unknown; importance?: unknown; articles?: unknown }[];
    };
    const used = new Set<number>();
    const events: MajorEvent[] = [];

    for (const raw of parsed.events ?? []) {
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      const numbers = Array.isArray(raw.articles)
        ? raw.articles.filter(
            (n): n is number =>
              typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= items.length && !used.has(n)
          )
        : [];
      if (!label || numbers.length === 0) continue;
      numbers.forEach((n) => used.add(n));
      events.push({
        label,
        importance: raw.importance === "major" ? "major" : "notable",
        urls: numbers.map((n) => items[n - 1].url),
      });
    }

    // Keep at most MAX_MAJOR_EVENTS majors; demote any extras so ordering stays by importance.
    let majors = 0;
    return events.map((event) => {
      if (event.importance !== "major") return event;
      majors += 1;
      return majors > MAX_MAJOR_EVENTS ? { ...event, importance: "notable" as const } : event;
    });
  } catch {
    return [];
  }
}

/**
 * Order the pool so curation sees what matters first: articles for major events, then
 * notable events, then everything else by source quality and recency.
 */
export function orderPoolByEvents(
  pool: GeneratedSource[],
  events: MajorEvent[]
): GeneratedSource[] {
  const byKey = new Map(pool.map((source) => [normalizeUrlKey(source.url), source]));
  const ordered: GeneratedSource[] = [];
  const seen = new Set<string>();

  for (const importance of ["major", "notable"] as const) {
    for (const event of events.filter((item) => item.importance === importance)) {
      for (const url of event.urls) {
        const key = normalizeUrlKey(url);
        const source = byKey.get(key);
        if (!source || seen.has(key)) continue;
        seen.add(key);
        ordered.push(source);
      }
    }
  }

  const rest = rankByQuality(pool.filter((source) => !seen.has(normalizeUrlKey(source.url))));
  return [...ordered, ...rest];
}
