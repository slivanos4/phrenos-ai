import type { GeneratedSource } from "@/lib/phrenos-updates/types";
import { sanitizeSourceFields } from "@/lib/phrenos-updates/sanitize";
import { isSocialMediaUrl } from "@/lib/phrenos-updates/source-text";
import {
  extractFactsFromArticle,
  isFirecrawlConfigured,
  scrapeArticleWithFirecrawl,
} from "@/lib/phrenos-updates/firecrawl-extract";
import { resolveSourcePublishedDate } from "@/lib/phrenos-updates/source-dates";
import { isSpecificArticleUrl } from "@/lib/phrenos-updates/research-sources";

const MAX_FIRECRAWL_URLS_PER_SECTION = 16;
const FIRECRAWL_CONCURRENCY = 3;

function articleKey(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

/** Scrape full articles and extract fact bullets for the research pool. */
export async function enrichSourcesWithFirecrawl(
  sources: GeneratedSource[]
): Promise<GeneratedSource[]> {
  if (!isFirecrawlConfigured()) return sources;

  const candidates = sources
    .filter(
      (source) =>
        source.url &&
        !source.is_synthesis &&
        !isSocialMediaUrl(source.url) &&
        isSpecificArticleUrl(source.url)
    )
    .slice(0, MAX_FIRECRAWL_URLS_PER_SECTION);

  const enrichedByUrl = new Map<string, GeneratedSource>();

  for (let index = 0; index < candidates.length; index += FIRECRAWL_CONCURRENCY) {
    const batch = candidates.slice(index, index + FIRECRAWL_CONCURRENCY);
    await Promise.all(
      batch.map(async (source) => {
        const scraped = await scrapeArticleWithFirecrawl(source.url);
        if (!scraped) return;

        const facts = await extractFactsFromArticle(source.title, scraped.markdown);
        const excerpt = facts
          ? facts
              .split("\n")
              .filter((line) => line.trim().startsWith("-"))
              .slice(0, 4)
              .join("\n")
              .slice(0, 600)
          : scraped.markdown.slice(0, 600);

        enrichedByUrl.set(
          articleKey(source.url),
          sanitizeSourceFields({
            ...source,
            excerpt: excerpt || source.excerpt,
            published_at: resolveSourcePublishedDate(
              source.url,
              scraped.published_at ?? source.published_at,
              source.published_at,
              scraped.markdown.slice(0, 1200)
            ),
            extracted_facts: facts || scraped.markdown.slice(0, 2000),
          })
        );
      })
    );
  }

  return sources.map((source) => {
    const enriched = enrichedByUrl.get(articleKey(source.url));
    return enriched ?? source;
  });
}

export function sourceFactsForPrompt(source: GeneratedSource): string {
  if (source.extracted_facts?.trim()) return source.extracted_facts.trim();
  return source.excerpt?.trim() ?? "";
}
