import { sanitizeDashes } from "@/lib/phrenos-updates/sanitize";
import { callAnthropicSafe } from "@/lib/phrenos-updates/anthropic";
import { buildFactExtractionPrompt } from "@/lib/phrenos-updates/prompts";
import {
  extractPublishedDateFromHtml,
  normalizePublishedDate,
} from "@/lib/phrenos-updates/source-dates";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

type FirecrawlScrapeResult = {
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    publishedTime?: string;
    ogPublishedTime?: string;
  };
  html?: string;
};

// Firecrawl rejects requests past roughly 28 per minute, and rejected requests still count against
// the limit. Both research sections scrape in parallel inside one process, so every request goes
// through this single gate instead of firing a burst and losing about half of it at random.
const FIRECRAWL_MIN_INTERVAL_MS = 2_500;
const FIRECRAWL_MAX_RETRY_WAIT_MS = 30_000;
let firecrawlNextSlot = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFirecrawlSlot() {
  const now = Date.now();
  const slot = Math.max(now, firecrawlNextSlot);
  firecrawlNextSlot = slot + FIRECRAWL_MIN_INTERVAL_MS;
  if (slot > now) await sleep(slot - now);
}

/** How long Firecrawl asked us to wait after a 429 (Retry-After header, or "retry after 21s" in the body). */
function retryAfterMs(response: Response, detail: string): number {
  const header = Number(response.headers.get("retry-after"));
  const fromBody = Number(detail.match(/retry after (\d+)\s*s/i)?.[1]);
  const seconds = Number.isFinite(header) && header > 0 ? header : fromBody;
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 + 500 : 20_000;
  return Math.min(ms, FIRECRAWL_MAX_RETRY_WAIT_MS);
}

export async function scrapeArticleWithFirecrawl(url: string): Promise<{
  markdown: string;
  published_at: string | null;
} | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey || !url) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await waitForFirecrawlSlot();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);

    try {
      const response = await fetch(`${FIRECRAWL_BASE}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "html"],
          onlyMainContent: true,
          timeout: 30_000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        if (response.status === 429 && attempt === 0) {
          const wait = retryAfterMs(response, detail);
          console.warn(`Firecrawl rate limited for ${url}; retrying once in ${Math.round(wait / 1000)}s`);
          // Push the shared gate back too, so other queued scrapes do not stampede into the same limit.
          firecrawlNextSlot = Math.max(firecrawlNextSlot, Date.now() + wait);
          clearTimeout(timer);
          await sleep(wait);
          continue;
        }
        console.error(
          `Firecrawl scrape failed (${response.status}) for ${url}: ${detail.slice(0, 300)}`
        );
        return null;
      }

      const payload = (await response.json()) as { success?: boolean; data?: FirecrawlScrapeResult };
      const data = payload.data;
      const markdown = data?.markdown?.trim();
      if (!markdown || markdown.length < 120) return null;

      const metaDate =
        data?.metadata?.publishedTime ??
        data?.metadata?.ogPublishedTime ??
        (data?.html ? extractPublishedDateFromHtml(data.html) : null);

      return {
        markdown: markdown.slice(0, 24_000),
        published_at: normalizePublishedDate(metaDate),
      };
    } catch (error) {
      console.error(`Firecrawl scrape error for ${url}:`, error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/** Pull strategy-relevant Gen AI facts from a full article body. */
export async function extractFactsFromArticle(title: string, markdown: string): Promise<string> {
  const text = await callAnthropicSafe(buildFactExtractionPrompt(title, markdown), 2000);
  return sanitizeDashes(text).slice(0, 4000);
}
