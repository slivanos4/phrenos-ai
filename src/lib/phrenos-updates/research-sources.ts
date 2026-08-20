import type { GeneratedSource } from "@/lib/phrenos-updates/types";
import { sanitizeSourceFields } from "@/lib/phrenos-updates/sanitize";
import { isSocialMediaUrl, isUsableSourceExcerpt } from "@/lib/phrenos-updates/source-text";
import {
  LOOKBACK_DAYS,
  comparePublishedDesc,
  isPublishedInPreferredWindow,
  isPublishedWithinLookback,
  resolveSourcePublishedDate,
  type SourceLookback,
} from "@/lib/phrenos-updates/source-dates";
import {
  fetchPublishedDateFromPage,
  verifyArticleSources,
} from "@/lib/phrenos-updates/source-url-verify";

const GENERIC_SINGLE_SEGMENTS = new Set([
  "news",
  "business",
  "articles",
  "article",
  "blog",
  "category",
  "topics",
  "tag",
  "tags",
  "ai",
  "tech",
  "technology",
  "research",
  "newsroom",
  "press",
  "index",
]);

export function isSpecificArticleUrl(url: string): boolean {
  if (isSocialMediaUrl(url)) return false;

  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return false;

    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    if (segments.length === 1) {
      const segment = segments[0].toLowerCase();
      if (GENERIC_SINGLE_SEGMENTS.has(segment) || segment.length < 10) return false;
    }

    if (
      segments.length === 2 &&
      segments.every((segment) => GENERIC_SINGLE_SEGMENTS.has(segment.toLowerCase()))
    ) {
      return false;
    }

    const lastSegment = segments[segments.length - 1] ?? "";
    const hasDateInPath = /\d{4}[/-]\d{2}/.test(path) || /\d{4}/.test(path);
    const hasSlug = lastSegment.length >= 8 || /-/.test(lastSegment);

    return path.length >= 12 && (segments.length >= 2 || hasDateInPath || hasSlug);
  } catch {
    return false;
  }
}

export function dedupeSources(sources: GeneratedSource[]): GeneratedSource[] {
  const seen = new Set<string>();
  const output: GeneratedSource[] = [];

  for (const source of sources) {
    const key = source.url.trim().toLowerCase().replace(/\/+$/, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function scoreSourceForTopic(source: GeneratedSource, topic: string): number {
  const haystack = `${source.title} ${source.excerpt} ${source.url}`.toLowerCase();
  const words = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function hasNonRootPath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, "") || "/";
    return pathname !== "/";
  } catch {
    return false;
  }
}

function withResolvedPublishedDate(
  source: GeneratedSource,
  lookback?: SourceLookback | null
): GeneratedSource {
  return {
    ...source,
    published_at: resolveSourcePublishedDate(
      source.url,
      source.published_at,
      source.published_at,
      `${source.title} ${source.excerpt}`,
      lookback
    ),
  };
}

function enrichFromPool(
  source: GeneratedSource,
  pool: GeneratedSource[],
  lookback: SourceLookback
): GeneratedSource {
  const match = pool.find((row) => row.url.toLowerCase() === source.url.toLowerCase());
  // Prefer the pool's verified date over any model-invented published_at.
  return withResolvedPublishedDate(
    {
      ...source,
      published_at: match?.published_at ?? source.published_at ?? null,
      extracted_facts: source.extracted_facts ?? match?.extracted_facts ?? null,
    },
    lookback
  );
}

function isEligibleArticleSource(source: GeneratedSource, lookback: SourceLookback): boolean {
  if (source.is_synthesis) return true;
  if (!source.url || isSocialMediaUrl(source.url)) return false;
  if (!isUsableSourceExcerpt(source.excerpt)) return false;
  if (!isSpecificArticleUrl(source.url)) return false;
  const publishedAt = withResolvedPublishedDate(source, lookback).published_at ?? null;
  // Every real article must have an extracted publish date inside the 2-week window.
  if (!publishedAt) return false;
  return isPublishedWithinLookback(publishedAt, lookback);
}

function sortArticleSources(
  sources: GeneratedSource[],
  topic: string,
  lookback: SourceLookback
): GeneratedSource[] {
  return [...sources].sort((left, right) => {
    const leftPreferred = isPublishedInPreferredWindow(left.published_at ?? null, lookback) ? 1 : 0;
    const rightPreferred = isPublishedInPreferredWindow(right.published_at ?? null, lookback)
      ? 1
      : 0;
    if (leftPreferred !== rightPreferred) return rightPreferred - leftPreferred;
    const topicScore = scoreSourceForTopic(right, topic) - scoreSourceForTopic(left, topic);
    if (topicScore !== 0) return topicScore;
    return comparePublishedDesc(left.published_at ?? null, right.published_at ?? null);
  });
}

function finalizeSources(
  sources: GeneratedSource[],
  lookback?: SourceLookback | null
): GeneratedSource[] {
  return sources.map((source) => sanitizeSourceFields(withResolvedPublishedDate(source, lookback)));
}

export function filterSourcesByLookback(
  sources: GeneratedSource[],
  lookback: SourceLookback
): GeneratedSource[] {
  return dedupeSources(sources)
    .map((source) => withResolvedPublishedDate(source, lookback))
    .filter((source) => source.is_synthesis || isEligibleArticleSource(source, lookback));
}

async function enrichSourcePublishedDates(
  sources: GeneratedSource[],
  lookback: SourceLookback
): Promise<GeneratedSource[]> {
  return Promise.all(
    sources.map(async (source) => {
      if (source.is_synthesis || !source.url) {
        return withResolvedPublishedDate(source, lookback);
      }

      let published_at = resolveSourcePublishedDate(
        source.url,
        source.published_at,
        source.published_at,
        `${source.title} ${source.excerpt}`,
        lookback
      );

      if (!published_at) {
        const fetched = await fetchPublishedDateFromPage(source.url);
        published_at = resolveSourcePublishedDate(
          source.url,
          fetched,
          source.published_at,
          null,
          lookback
        );
      }

      return sanitizeSourceFields({ ...source, published_at });
    })
  );
}

export function ensureStorySources(
  storySources: GeneratedSource[] | undefined,
  pool: GeneratedSource[],
  topic: string,
  lookback: SourceLookback,
  minCount = 2,
  maxCount = 40
): GeneratedSource[] {
  const datedPool = filterSourcesByLookback(pool, lookback);
  const articlePool = sortArticleSources(
    datedPool.filter(
      (source) =>
        source.url &&
        !isSocialMediaUrl(source.url) &&
        isSpecificArticleUrl(source.url) &&
        isUsableSourceExcerpt(source.excerpt) &&
        !source.is_synthesis
    ),
    topic,
    lookback
  );

  const fromStory = sortArticleSources(
    dedupeSources(storySources ?? [])
      .map((source) => enrichFromPool(source, datedPool, lookback))
      .filter(
        (source) =>
          source.url &&
          !isSocialMediaUrl(source.url) &&
          isSpecificArticleUrl(source.url) &&
          isUsableSourceExcerpt(source.excerpt) &&
          !source.is_synthesis
      )
      .filter((source) => isEligibleArticleSource(source, lookback)),
    topic,
    lookback
  );

  const synthesis = dedupeSources(storySources ?? []).filter((source) => source.is_synthesis);

  const ranked: GeneratedSource[] = [...fromStory];
  const usedUrls = new Set(fromStory.map((source) => source.url.toLowerCase()));

  for (const candidate of articlePool) {
    if (ranked.length >= maxCount) break;
    const key = candidate.url.toLowerCase();
    if (usedUrls.has(key)) continue;
    if (scoreSourceForTopic(candidate, topic) === 0 && ranked.length >= minCount) continue;
    usedUrls.add(key);
    ranked.push(candidate);
  }

  if (ranked.length < minCount) {
    for (const candidate of datedPool) {
      if (ranked.length >= minCount) break;
      if (!candidate.url || candidate.is_synthesis || !hasNonRootPath(candidate.url)) continue;
      const key = candidate.url.toLowerCase();
      if (usedUrls.has(key)) continue;
      usedUrls.add(key);
      ranked.push({ ...candidate, is_synthesis: false });
    }
  }

  const articles = ranked.slice(0, maxCount);
  if (articles.length >= minCount) {
    return finalizeSources(
      synthesis.length > 0 ? [...articles, ...synthesis.slice(0, 1)] : articles,
      lookback
    );
  }

  if (articles.length === 0) {
    return finalizeSources(
      synthesis.length > 0
        ? synthesis.slice(0, maxCount)
        : [
            {
              url: "",
              title: "Editorial synthesis",
              excerpt: `No verifiable article URLs with a publish date in the past ${LOOKBACK_DAYS} days matched "${topic}" in this run. Re-run research or add sources manually.`,
              is_synthesis: true,
              published_at: null,
            },
          ],
      lookback
    );
  }

  return finalizeSources(
    [...articles, ...synthesis.slice(0, 1)].slice(0, maxCount + 1),
    lookback
  );
}

export async function ensureVerifiedStorySources(
  storySources: GeneratedSource[] | undefined,
  pool: GeneratedSource[],
  topic: string,
  lookback: SourceLookback,
  minCount = 2,
  maxCount = 40
): Promise<GeneratedSource[]> {
  const sources = ensureStorySources(storySources, pool, topic, lookback, minCount, maxCount);
  const verified = await verifyArticleSources(sources);
  const dated = await enrichSourcePublishedDates(verified, lookback);
  // Re-filter after date extraction so stale or missing dates never persist.
  const inWindow = dated.filter(
    (source) =>
      source.is_synthesis ||
      (Boolean(source.published_at) &&
        isPublishedWithinLookback(source.published_at ?? null, lookback))
  );
  const articles = inWindow.filter((source) => !source.is_synthesis && source.url);
  if (articles.length > 0) {
    return inWindow;
  }
  return unavailableArticleSources(topic);
}

export function unavailableArticleSources(topic: string): GeneratedSource[] {
  return finalizeSources([
    {
      url: "",
      title: "Live article links unavailable",
      excerpt: `No verified articles with extractable publish dates from the past ${LOOKBACK_DAYS} days were found for "${topic}". Check TAVILY_API_KEY and ANTHROPIC_API_KEY are set, redeploy, then re-run this week.`,
      is_synthesis: true,
      published_at: null,
    },
  ]);
}
