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

export async function scrapeArticleWithFirecrawl(url: string): Promise<{
  markdown: string;
  published_at: string | null;
} | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey || !url) return null;

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

/** Pull strategy-relevant Gen AI facts from a full article body. */
export async function extractFactsFromArticle(title: string, markdown: string): Promise<string> {
  const text = await callAnthropicSafe(buildFactExtractionPrompt(title, markdown), 2000);
  return sanitizeDashes(text).slice(0, 4000);
}
