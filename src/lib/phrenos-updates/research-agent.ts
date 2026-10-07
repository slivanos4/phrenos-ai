import {
  AUTHOR_BRIEF_SOURCE_TITLE,
  MAX_STORIES_PER_SECTION,
  SECTION_LABELS,
  type GeneratedSource,
  type GeneratedStory,
  type GeneratedSuggestion,
  type ResearchSection,
} from "@/lib/phrenos-updates/types";
import {
  sanitizeDashes,
  sanitizeEditorialText,
  sanitizeSourceFields,
  sanitizeSummaryText,
  summaryToPlainText,
} from "@/lib/phrenos-updates/sanitize";
import {
  ANTHROPIC_MODEL,
  callAnthropic,
  callAnthropicSafe,
  extractJsonArray,
  extractJsonObject,
  readApiError,
} from "@/lib/phrenos-updates/anthropic";
import { BRITISH_ENGLISH_BLOCK, SOURCE_INTEGRITY_BLOCK, STORY_SUMMARY_RULES } from "@/lib/phrenos-updates/prompts";
import {
  dedupeSources,
  enrichPoolPublishedDates,
  ensureStorySources,
  ensureVerifiedStorySources,
  filterDiscoveryCandidates,
  filterSourcesByLookback,
  isSpecificArticleUrl,
} from "@/lib/phrenos-updates/research-sources";
import { resolveSourcePublishedDate, isPublishedWithinLookback } from "@/lib/phrenos-updates/source-dates";
import {
  buildSummaryFromExcerpts,
  ensurePolishedSummaries,
  normalizeStoryTitle,
  polishSummary,
} from "@/lib/phrenos-updates/story-summary";
import { enrichSourcesWithFirecrawl, sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import {
  extractFactsFromArticle,
  scrapeArticleWithFirecrawl,
} from "@/lib/phrenos-updates/firecrawl-extract";
import { isExaConfigured, searchExaArticles } from "@/lib/phrenos-updates/exa-search";
import {
  AI_NEWS_DOMAINS,
  discoveryQueriesForSection,
  tavilyBodyForQuery,
  tavilyMinimalBody,
  tavilyQueriesForSection,
  type TavilySearchOptions,
} from "@/lib/phrenos-updates/research-discovery";

import {
  identifyMajorEvents,
  MAX_MAJOR_EVENTS,
  normalizeUrlKey,
  orderPoolByEvents,
  rankByQuality,
  type MajorEvent,
} from "@/lib/phrenos-updates/major-events";

export type { GeneratedSource, GeneratedStory, GeneratedSuggestion };
export { tavilyQueriesForSection };

export type ResearchAgentInput = {
  lookbackStart: string;
  lookbackEnd: string;
  /** Complementary desk brief prompt block from Cursor weekly GenAI ideas. */
  deskBriefPrompt?: string;
  /** Preferred source URLs extracted from the desk brief. */
  deskBriefUrls?: string[];
};

type TavilyFetchResult = {
  sources: GeneratedSource[];
  error?: string;
};

const TOPIC_TAG_PATTERNS: [string, RegExp][] = [
  ["models", /\b(?:model|llm|gpt|claude|gemini|llama|mistral|checkpoint|weights)\b/i],
  ["open-source", /\bopen[- ]source|open weights|apache 2\.0|permissive licence\b/i],
  ["enterprise", /\benterprise|business customers|deployment|procurement|seats|pricing tier\b/i],
  ["regulation", /\bregulat\w+|eu ai act|legislation|antitrust|lawsuit|copyright|compliance\b/i],
  ["safety", /\bsafety|alignment|jailbreak|misuse|guardrail|red team|incident\b/i],
  ["research", /\bresearch|paper|arxiv|study|benchmark|evaluation|state of the art\b/i],
  ["agentic", /\bagent\w*|autonomous|tool use|computer use|browser control\b/i],
  ["multimodal", /\bmultimodal|vision|image|video|audio|speech|voice\b/i],
  ["developer-tools", /\bapi|sdk|developer|ide|copilot|code generation|cli\b/i],
  ["consumer", /\bconsumer|app store|subscription|free tier|users\b/i],
  ["infrastructure", /\bgpu|chip|datacent(?:re|er)|compute|inference cost|nvidia|cluster\b/i],
];

function inferTopicTags(text: string, provided?: string[]): string[] {
  const fromModel = (provided ?? [])
    .map((tag) => sanitizeDashes(String(tag)).toLowerCase().trim())
    .filter(Boolean);
  if (fromModel.length > 0) return [...new Set(fromModel)].slice(0, 6);

  const inferred = TOPIC_TAG_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(
    ([tag]) => tag
  );
  return inferred.length > 0 ? inferred.slice(0, 4) : ["models"];
}

function sanitizeStory(story: GeneratedStory): GeneratedStory {
  const sources = story.sources.map((source) => sanitizeSourceFields(source));
  const title = sanitizeEditorialText(story.title ?? "");
  return {
    ...story,
    title,
    summary_html: sanitizeSummaryText(
      summaryToPlainText(polishSummary(title, story.summary_html ?? "", sources))
    ),
    topic_tags: inferTopicTags(
      `${title} ${story.summary_html ?? ""} ${sources.map((source) => source.excerpt).join(" ")}`,
      story.topic_tags
    ),
    sources,
    suggestions: (story.suggestions ?? []).map((suggestion) => ({
      ...suggestion,
      title: sanitizeEditorialText(suggestion.title ?? ""),
      hook: sanitizeEditorialText(suggestion.hook ?? ""),
      body_html: sanitizeEditorialText(suggestion.body_html ?? ""),
      cta: sanitizeEditorialText(suggestion.cta ?? ""),
      hashtags: sanitizeEditorialText(suggestion.hashtags ?? ""),
      image_ideas: sanitizeEditorialText(suggestion.image_ideas ?? ""),
    })),
  };
}

/** Doc section 9: story curation prompt. Summaries only, content pack runs later. */
/** How many ranked articles the curation prompt may see (was an unranked first 12). */
const CURATION_SOURCE_LIMIT = 30;
const MAX_STORIES_WITH_MAJOR_EVENTS = 5;

function buildStoryGenerationPrompt(
  input: ResearchAgentInput,
  section: ResearchSection,
  webSources: GeneratedSource[],
  options: { count?: number; mustCover?: MajorEvent[]; authorBrief?: string } = {}
): string {
  const count = options.count ?? MAX_STORIES_PER_SECTION;
  const authorBriefBlock = options.authorBrief
    ? `AUTHOR'S BRIEF (the subject and angle Sophia wants; the story must be about exactly this):
"""
${options.authorBrief}
"""
The brief is direction, NOT a source. Include a factual claim from it only if a listed article supports it, and leave out anything the articles do not support (dates, figures, quotes, features). The story title and summary must reflect the brief's angle.

`
    : "";
  const mustCover = options.mustCover ?? [];
  const mustCoverBlock =
    mustCover.length > 0
      ? `MUST-COVER DEVELOPMENTS (found by reading the full article list; each is significant and must not be left out):
${mustCover
  .map((event, index) => `${index + 1}. ${event.label}\n   articles: ${event.urls.join(", ")}`)
  .join("\n")}
Give each must-cover development its own story, built from the articles listed for it (merge two only if they are literally the same development). Use any remaining story slots for the next most significant developments.

`
      : "";
  const sourceRules =
    webSources.length > 0
      ? `  * Each source MUST be a specific article from the "Web articles found" list below
  * Copy the exact url, title, and published_at from that list. Do NOT invent URLs or dates
  * published_at is required for every real article and MUST fall within ${input.lookbackStart} to ${input.lookbackEnd} (the research period). Reject anything older or undated
  * NEVER use homepage, section index, or domain-root links
  * NEVER use Instagram, Facebook, Twitter/X, TikTok, or LinkedIn post URLs. Use publisher articles, official company blogs, and research coverage only
  * Use is_synthesis:true ONLY when no listed article supports a minor point; max one synthesis source per story`
      : `  * No web articles were retrieved. Use is_synthesis:true for sources and keep the summary to general context only.`;

  return `You are a generative AI industry research analyst for Phrenos.ai (phrenosai.com), founded by Sophia Livanos. Your readers are leaders, strategists, and practitioners who need signal, not hype.

Period: ${input.lookbackStart} to ${input.lookbackEnd}.
Section: ${SECTION_LABELS[section]}

Prefer stories covered by serious AI news desks (for example Artificial Intelligence News, AI Weekly, TechCrunch, The Verge, Wired, MIT Technology Review, Reuters) and official lab or product blogs when present in the list below.
Only use articles from this period. Reject older news recycled as if it were new. Do not mention months outside ${input.lookbackStart} to ${input.lookbackEnd}.

${SOURCE_INTEGRITY_BLOCK}

${BRITISH_ENGLISH_BLOCK}

${input.deskBriefPrompt ? `${input.deskBriefPrompt}\n` : ""}
${authorBriefBlock}${mustCoverBlock}Generate exactly ${count} distinct news stories as a JSON array from the articles below. Each story must cover a different article or trend. Prioritise stories that are strategically significant, surprising, or eye-opening when the sources support that. When the desk brief suggests an angle, prefer matching in-period articles from the list if they exist — never invent facts from the brief alone.

Each story needs:
- title (string): specific editorial headline reflecting the trend, not the raw article headline
- summary_html (plain text only)
${STORY_SUMMARY_RULES}
- topic_tags (array: include relevant tags from models, open-source, enterprise, regulation, safety, research, agentic, multimodal, developer-tools, consumer, infrastructure, eye-opening)
- sources (array: include ALL relevant verified articles from the list that support this story, each as {url, title, excerpt, published_at, is_synthesis})
  CRITICAL source rules:
${sourceRules}
  * excerpt should quote or paraphrase the listed article snippet
  * Never use em-dash or en-dash characters in source titles or excerpts

Web articles found:
${JSON.stringify(webSources.slice(0, CURATION_SOURCE_LIMIT), null, 2)}

Return ONLY valid JSON array, no markdown fences or commentary.`;
}

function keepInPeriodStories(
  stories: GeneratedStory[],
  input: ResearchAgentInput
): GeneratedStory[] {
  return stories.filter((story) => {
    // Require at least one real source with an in-window publish date.
    // Do NOT scan excerpts for older month names — AI news routinely references
    // prior releases ("since Llama 4", "July benchmark") without being stale.
    const inWindowSources = story.sources.filter(
      (source) =>
        !source.is_synthesis &&
        Boolean(source.published_at) &&
        isPublishedWithinLookback(source.published_at ?? null, input)
    );

    if (inWindowSources.length > 0) return true;

    if (story.sources.length > 0 && story.sources.every((source) => source.is_synthesis)) {
      return true;
    }

    console.warn(`Dropping story with no in-window dated sources: ${story.title}`);
    return false;
  });
}

async function callAnthropicForStories(
  section: ResearchSection,
  prompt: string,
  count: number = MAX_STORIES_PER_SECTION
): Promise<GeneratedStory[]> {
  const text = await callAnthropic(prompt, 16000);
  const jsonPayload = extractJsonArray(text);
  if (!jsonPayload) {
    throw new Error(
      `Anthropic returned no JSON array for ${section}. Response preview: ${text.slice(0, 240)}`
    );
  }

  const parsed = JSON.parse(jsonPayload) as GeneratedStory[];
  return parsed
    .slice(0, count)
    .map((story) => sanitizeStory({ ...story, section, suggestions: [] }));
}

function mapTavilyRows(
  rows: { title?: string; url?: string; content?: string; published_date?: string }[],
  input: ResearchAgentInput
): GeneratedSource[] {
  return filterDiscoveryCandidates(
    dedupeSources(
      rows
        .filter((row) => row.url && isSpecificArticleUrl(row.url))
        .map((row) => {
          const title = row.title?.trim() || "Source";
          const excerpt = (row.content ?? "").trim() || `Article: ${title}`;
          return sanitizeSourceFields({
            url: row.url ?? "",
            title,
            excerpt: excerpt.slice(0, 500),
            published_at: resolveSourcePublishedDate(
              row.url ?? "",
              row.published_date,
              null,
              `${title} ${row.content ?? ""}`
            ),
            is_synthesis: false,
          });
        })
    ),
    input
  );
}

async function fetchExaContextDetailed(
  options: TavilySearchOptions | string,
  input: ResearchAgentInput
): Promise<TavilyFetchResult> {
  if (!isExaConfigured()) {
    return { sources: [], error: "EXA_API_KEY is not configured." };
  }

  const search =
    typeof options === "string"
      ? ({ query: options, topic: "news", maxResults: 10 } satisfies TavilySearchOptions)
      : options;

  const result = await searchExaArticles({
    query: search.query,
    lookback: input,
    includeDomains: search.includeDomains,
    maxResults: search.maxResults ?? 10,
    preferNews: search.topic !== "general",
  });

  if (result.error && result.sources.length === 0) {
    console.error(`Exa fallback failed for "${search.query}": ${result.error}`);
    return { sources: [], error: result.error };
  }

  const sources = mapTavilyRows(result.sources, input);
  if (sources.length === 0) {
    return {
      sources: [],
      error: result.error ?? `Exa returned no usable article URLs for: ${search.query}`,
    };
  }

  return { sources };
}

async function fetchTavilyContextDetailed(
  options: TavilySearchOptions | string,
  input: ResearchAgentInput
): Promise<TavilyFetchResult> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return { sources: [], error: "TAVILY_API_KEY is not configured." };
  }

  const search =
    typeof options === "string"
      ? ({ query: options, topic: "news", maxResults: 10 } satisfies TavilySearchOptions)
      : options;

  const attempts: Record<string, unknown>[] = [
    tavilyBodyForQuery(search, input, apiKey, "full"),
    tavilyBodyForQuery(
      { ...search, topic: "general", includeDomains: undefined },
      input,
      apiKey,
      "full"
    ),
    tavilyMinimalBody(search.query, apiKey),
  ];

  let lastError: string | null = null;

  for (const body of attempts) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await readApiError(response);
        lastError = `Tavily search failed (${response.status}): ${detail}`;
        console.error(`${lastError} query="${search.query}"`);
        if (response.status === 401 || response.status === 403) {
          return { sources: [], error: lastError };
        }
        continue;
      }

      const data = (await response.json()) as {
        results?: {
          title?: string;
          url?: string;
          content?: string;
          published_date?: string;
        }[];
      };

      const sources = mapTavilyRows(data.results ?? [], input);
      if (sources.length > 0) {
        return { sources };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Tavily request failed.";
      console.error(`Tavily request error for "${search.query}":`, lastError);
    }
  }

  return {
    sources: [],
    error: lastError ?? `No usable article URLs for query: ${search.query}`,
  };
}

/** Prefer Tavily; fall back to Exa when Tavily is empty, missing, or failing. */
async function fetchDiscoveryContextDetailed(
  options: TavilySearchOptions | string,
  input: ResearchAgentInput
): Promise<TavilyFetchResult> {
  const hasTavily = Boolean(process.env.TAVILY_API_KEY?.trim());
  const hasExa = isExaConfigured();

  if (!hasTavily && !hasExa) {
    return {
      sources: [],
      error: "Neither TAVILY_API_KEY nor EXA_API_KEY is configured.",
    };
  }

  if (hasTavily) {
    const tavily = await fetchTavilyContextDetailed(options, input);
    if (tavily.sources.length > 0) return tavily;

    if (hasExa) {
      console.warn(
        `Tavily returned no sources; trying Exa fallback for "${
          typeof options === "string" ? options : options.query
        }"`
      );
      const exa = await fetchExaContextDetailed(options, input);
      if (exa.sources.length > 0) return exa;
      return {
        sources: [],
        error: [tavily.error, exa.error].filter(Boolean).join(" | ") || undefined,
      };
    }

    return tavily;
  }

  return fetchExaContextDetailed(options, input);
}

async function fetchTavilyContext(
  options: TavilySearchOptions | string,
  input: ResearchAgentInput
): Promise<GeneratedSource[]> {
  const result = await fetchDiscoveryContextDetailed(options, input);
  return result.sources;
}

async function fetchSectionSources(
  section: ResearchSection,
  input: ResearchAgentInput
): Promise<{ sources: GeneratedSource[]; errors: string[] }> {
  const baseQueries = discoveryQueriesForSection(section, input);

  let claudeQueries: TavilySearchOptions[] = [];
  try {
    const { proposeClaudeDiscoverySearches } = await import(
      "@/lib/phrenos-updates/claude-discovery"
    );
    const plan = await proposeClaudeDiscoverySearches(section, {
      ...input,
      deskBriefPrompt: input.deskBriefPrompt,
    });
    claudeQueries = plan.queries;
    if (plan.domains.length > 0) {
      claudeQueries.push({
        query: `generative AI ${SECTION_LABELS[section]} news ${input.lookbackEnd}`,
        topic: "news",
        includeDomains: plan.domains,
        maxResults: 10,
      });
    }
  } catch (error) {
    console.error("Claude discovery planning failed:", error);
  }

  const queries = [...baseQueries, ...claudeQueries];

  // Prefer desk-brief URLs as extra discovery hints when available.
  if (input.deskBriefUrls && input.deskBriefUrls.length > 0) {
    const hintTitles = input.deskBriefUrls.slice(0, 3).map((url) => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return "AI news";
      }
    });
    for (const host of [...new Set(hintTitles)].slice(0, 2)) {
      queries.push({
        query: `${host} generative AI ${SECTION_LABELS[section]} ${input.lookbackEnd}`,
        topic: "news",
        maxResults: 6,
      });
    }
  }

  const batches = await Promise.all(
    queries.map((query) => fetchDiscoveryContextDetailed(query, input))
  );
  const sources = dedupeSources(batches.flatMap((batch) => batch.sources));
  const errors = batches
    .map((batch) => batch.error)
    .filter((error): error is string => Boolean(error));
  return { sources, errors };
}

/** Doc section 9 post-processing: per-story Tavily top-up plus source verification. */
async function enrichStoriesWithSources(
  stories: GeneratedStory[],
  sectionPool: GeneratedSource[],
  input: ResearchAgentInput
): Promise<GeneratedStory[]> {
  return Promise.all(
    stories.map(async (story) => {
      const topicSources = await fetchTavilyContext(
        {
          query: `${story.title} generative AI news`,
          topic: "news",
          maxResults: 8,
        },
        input
      );
      const pool = dedupeSources([...topicSources, ...sectionPool]);

      return sanitizeStory({
        ...story,
        sources: await ensureVerifiedStorySources(story.sources, pool, story.title, input),
      });
    })
  );
}

/**
 * Deterministic fallback when curation fails: anchor one story per top article and
 * build summaries from extracted facts so nothing is invented.
 */
function buildStoriesFromPool(
  section: ResearchSection,
  input: ResearchAgentInput,
  pool: GeneratedSource[]
): GeneratedStory[] {
  if (pool.length === 0) return [];

  const anchors = pool.slice(0, MAX_STORIES_PER_SECTION);

  return anchors.map((anchor) => {
    const title = normalizeStoryTitle(anchor);
    const sources = ensureStorySources([anchor], pool, title, input);
    return sanitizeStory({
      section,
      title,
      summary_html: buildSummaryFromExcerpts(title, sources),
      topic_tags: [],
      sources,
      suggestions: [],
    });
  });
}

/** True when a story already draws on any article that belongs to this event. */
function storyCoversEvent(story: GeneratedStory, event: MajorEvent): boolean {
  const keys = new Set(event.urls.map(normalizeUrlKey));
  return story.sources.some((source) => keys.has(normalizeUrlKey(source.url)));
}

async function generateSectionStories(
  input: ResearchAgentInput,
  section: ResearchSection,
  webSources: GeneratedSource[],
  knownEvents?: MajorEvent[]
): Promise<GeneratedStory[]> {
  if (webSources.length === 0) return [];

  // Significant developments are identified from the whole pool and ordered first, instead of
  // depending on where they happened to land in an unranked list.
  const events = knownEvents ?? (await identifyMajorEvents(section, webSources, input));
  const majors = events.filter((event) => event.importance === "major");
  const ordered = orderPoolByEvents(webSources, events);
  const count = Math.min(
    MAX_STORIES_WITH_MAJOR_EVENTS,
    Math.max(MAX_STORIES_PER_SECTION, Math.min(majors.length, MAX_MAJOR_EVENTS))
  );
  console.info(
    `Curation ${section}: ${webSources.length} articles, ${events.length} events (${majors.length} major) -> ${count} stories`
  );

  try {
    const stories = await callAnthropicForStories(
      section,
      buildStoryGenerationPrompt(input, section, ordered, { count, mustCover: majors }),
      count
    );

    if (stories.length > 0) {
      // Guarantee: any major development the model still left out gets its own story.
      const missing = majors.filter(
        (event) => !stories.some((story) => storyCoversEvent(story, event))
      );
      for (const event of missing) {
        console.warn(`Curation ${section}: major event not covered, adding story for "${event.label}"`);
        const eventArticles = ordered.filter((source) =>
          event.urls.map(normalizeUrlKey).includes(normalizeUrlKey(source.url))
        );
        try {
          const extra = await callAnthropicForStories(
            section,
            buildStoryGenerationPrompt(input, section, eventArticles, {
              count: 1,
              mustCover: [event],
            }),
            1
          );
          stories.push(...extra);
        } catch (error) {
          console.error(`Could not add story for "${event.label}":`, error);
          stories.push(...buildStoriesFromPool(section, input, eventArticles).slice(0, 1));
        }
      }

      return Promise.all(
        stories.map(async (story) =>
          sanitizeStory({
            ...story,
            sources: await ensureVerifiedStorySources(
              story.sources,
              webSources,
              story.title,
              input
            ),
          })
        )
      );
    }
  } catch (error) {
    console.error(`Story curation failed for ${section}:`, error);
    const message = error instanceof Error ? error.message : "";
    if (/credit balance|invalid x-api-key|authentication/i.test(message)) {
      throw error;
    }
  }

  return buildStoriesFromPool(section, input, ordered);
}

export async function runResearchAgent(input: ResearchAgentInput): Promise<GeneratedStory[]> {
  const hasLlm = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasSearch =
    Boolean(process.env.TAVILY_API_KEY?.trim()) || isExaConfigured();

  if (!hasLlm || !hasSearch) {
    throw new Error(
      "Research requires ANTHROPIC_API_KEY and at least one of TAVILY_API_KEY or EXA_API_KEY. Add them to your environment, redeploy, then re-run."
    );
  }

  const [modelsResult, productsResult] = await Promise.all([
    fetchSectionSources("models_research", input),
    fetchSectionSources("products_industry", input),
  ]);

  const modelsPool = modelsResult.sources;
  const productsPool = productsResult.sources;

  if (modelsPool.length === 0 && productsPool.length === 0) {
    const authError = [...modelsResult.errors, ...productsResult.errors].find((error) =>
      /401|403|api key|unauthorized|invalid/i.test(error)
    );
    throw new Error(
      authError ??
        "Search returned no recent article URLs. Check TAVILY_API_KEY / EXA_API_KEY on Vercel, redeploy, then re-run."
    );
  }

  // Read each whole pool once and rank it by importance BEFORE the expensive steps, so the
  // in-depth article reads (Firecrawl is capped and rate-limited) go to major developments first.
  const [modelsEvents, productsEvents] = await Promise.all([
    identifyMajorEvents("models_research", modelsPool, input),
    identifyMajorEvents("products_industry", productsPool, input),
  ]);

  const [enrichedModelsPool, enrichedProductsPool] = await Promise.all([
    enrichSourcesWithFirecrawl(orderPoolByEvents(modelsPool, modelsEvents), input),
    enrichSourcesWithFirecrawl(orderPoolByEvents(productsPool, productsEvents), input),
  ]);

  const [datedModelsPool, datedProductsPool] = await Promise.all([
    enrichPoolPublishedDates(enrichedModelsPool, input).then((sources) =>
      filterSourcesByLookback(sources, input)
    ),
    enrichPoolPublishedDates(enrichedProductsPool, input).then((sources) =>
      filterSourcesByLookback(sources, input)
    ),
  ]);

  if (datedModelsPool.length === 0 && datedProductsPool.length === 0) {
    throw new Error(
      `Found ${modelsPool.length + productsPool.length} candidate articles, but none had extractable publish dates in the past two weeks. Re-run after checking FIRECRAWL_API_KEY, or broaden source coverage.`
    );
  }

  const [modelStories, productStories] = await Promise.all([
    generateSectionStories(input, "models_research", datedModelsPool, modelsEvents),
    generateSectionStories(input, "products_industry", datedProductsPool, productsEvents),
  ]);

  if (modelStories.length === 0 && productStories.length === 0) {
    throw new Error(
      `Live research returned no stories with dated sources from the past two weeks (model: ${ANTHROPIC_MODEL}). Check ANTHROPIC_API_KEY, redeploy after env changes, then re-run.`
    );
  }

  const [enrichedModelStories, enrichedProductStories] = await Promise.all([
    enrichStoriesWithSources(modelStories, datedModelsPool, input),
    enrichStoriesWithSources(productStories, datedProductsPool, input),
  ]);

  const inPeriod = keepInPeriodStories(
    [...enrichedModelStories, ...enrichedProductStories],
    input
  );

  if (inPeriod.length === 0) {
    throw new Error(
      "Research found articles, but every curated story fell outside the two-week window. Re-run this week."
    );
  }

  return ensurePolishedSummaries(inPeriod);
}

export type BriefClaimCheck = {
  claim: string;
  status: "supported" | "unverified" | "contradicted";
  note: string;
};

const CUSTOM_WINDOW_DAYS = 90;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function planCustomResearch(
  brief: string,
  input: ResearchAgentInput
): Promise<{ queries: string[]; claims: string[] }> {
  const fallback = { queries: [brief.replace(/\s+/g, " ").slice(0, 120)], claims: [] as string[] };
  const text = await callAnthropicSafe(
    `You help Phrenos.ai research a topic its author wants to write about.
Today is ${input.lookbackEnd}. Research window: ${input.lookbackStart} to ${input.lookbackEnd}.

Author's brief:
"""
${brief}
"""

Return ONLY JSON:
{"queries":["up to 4 short web news search queries, each naming the specific company, product or event"],"claims":["each specific factual assertion in the brief (a date, number, quote, named feature or capability) as a short standalone statement, at most 8"]}

Rules: queries must not include years or months outside the research window. Do not invent claims that the brief does not make.`,
    900
  );
  const json = text ? extractJsonObject(text) : null;
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json) as { queries?: unknown; claims?: unknown };
    const strings = (value: unknown, max: number) =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length >= 8)
            .slice(0, max)
        : [];
    const queries = strings(parsed.queries, 4);
    return { queries: queries.length > 0 ? queries : fallback.queries, claims: strings(parsed.claims, 8) };
  } catch {
    return fallback;
  }
}

async function readUserSourceUrl(url: string, input: ResearchAgentInput): Promise<GeneratedSource | null> {
  if (!isSpecificArticleUrl(url)) return null;
  const scraped = await scrapeArticleWithFirecrawl(url);
  if (!scraped) return null;
  const heading = scraped.markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = heading || new URL(url).hostname.replace(/^www\./, "");
  const facts = await extractFactsFromArticle(title, scraped.markdown);
  return sanitizeSourceFields({
    url,
    title,
    excerpt: (facts || scraped.markdown).slice(0, 500),
    published_at: resolveSourcePublishedDate(
      url,
      scraped.published_at,
      null,
      scraped.markdown.slice(0, 1200),
      input
    ),
    is_synthesis: false,
    extracted_facts: facts || scraped.markdown.slice(0, 2000),
  });
}

async function checkBriefClaims(
  claims: string[],
  sources: GeneratedSource[]
): Promise<BriefClaimCheck[]> {
  if (claims.length === 0) return [];
  const unchecked = claims.map((claim) => ({
    claim,
    status: "unverified" as const,
    note: "Could not be checked against the sources.",
  }));
  const packet = sources
    .filter((source) => !source.is_synthesis && source.url)
    .slice(0, 14)
    .map((source) => ({
      url: source.url,
      title: source.title,
      published_at: source.published_at ?? null,
      facts: sourceFactsForPrompt(source).slice(0, 1200),
    }));
  if (packet.length === 0) return unchecked;

  const text = await callAnthropicSafe(
    `You fact-check claims an author made in a writing brief against the source articles below. Judge each claim ONLY from the sources.

Statuses: "supported" (a source states it), "contradicted" (a source states something different, for example another date), "unverified" (no source either way). Keep each note to one short sentence that names what the sources actually say.

Claims:
${JSON.stringify(claims)}

Sources:
${JSON.stringify(packet, null, 2)}

Return ONLY JSON: {"checks":[{"claim":"...","status":"supported","note":"..."}]} with one entry per claim, in the same order.`,
    1800
  );
  const json = text ? extractJsonObject(text) : null;
  if (!json) return unchecked;
  try {
    const parsed = JSON.parse(json) as { checks?: { claim?: unknown; status?: unknown; note?: unknown }[] };
    const checks = (parsed.checks ?? []).map((item, index): BriefClaimCheck => ({
      claim: typeof item.claim === "string" && item.claim.trim() ? item.claim.trim() : claims[index] ?? "",
      status:
        item.status === "supported" || item.status === "contradicted" ? item.status : "unverified",
      note: sanitizeDashes(typeof item.note === "string" ? item.note.trim() : ""),
    }));
    return checks.length > 0 ? checks : unchecked;
  } catch {
    return unchecked;
  }
}

/**
 * Research a topic Sophia has described in her own words: plan searches from the brief, read the
 * articles, write one story on her angle, and report which of her claims the sources back up.
 * The brief is stored on the story as a synthesis source so later drafts keep following it, but it is
 * never evidence: drafts and the fact-checker only see real articles.
 */
export async function researchCustomTopic(options: {
  brief: string;
  section: ResearchSection;
  sourceUrls?: string[];
}): Promise<{
  story: GeneratedStory;
  claimChecks: BriefClaimCheck[];
  articleCount: number;
  unreadableUrls: string[];
}> {
  if (!process.env.ANTHROPIC_API_KEY?.trim() || !(process.env.TAVILY_API_KEY?.trim() || isExaConfigured())) {
    throw new Error("Research requires ANTHROPIC_API_KEY and TAVILY_API_KEY (or EXA_API_KEY).");
  }

  const brief = options.brief.trim();
  const end = new Date();
  const input: ResearchAgentInput = {
    lookbackStart: isoDay(new Date(end.getTime() - CUSTOM_WINDOW_DAYS * 86_400_000)),
    lookbackEnd: isoDay(end),
  };

  const plan = await planCustomResearch(brief, input);
  const searches: TavilySearchOptions[] = [
    ...plan.queries.map((query) => ({ query, topic: "general" as const, maxResults: 10 })),
    {
      query: plan.queries[0],
      topic: "general" as const,
      includeDomains: AI_NEWS_DOMAINS,
      maxResults: 10,
    },
  ];

  const urls = [...new Set((options.sourceUrls ?? []).map((url) => url.trim()).filter(Boolean))].slice(0, 8);
  const [batches, userRead] = await Promise.all([
    Promise.all(searches.map((search) => fetchDiscoveryContextDetailed(search, input))),
    Promise.all(urls.map((url) => readUserSourceUrl(url, input))),
  ]);

  const unreadableUrls = urls.filter((_, index) => !userRead[index]);
  const userSources = userRead.filter((source): source is GeneratedSource => source !== null);
  const webPool = filterDiscoveryCandidates(
    dedupeSources(batches.flatMap((batch) => batch.sources)),
    input
  );

  // User links are already read in full; only the web results still need their in-depth read.
  const enrichedWeb = await enrichSourcesWithFirecrawl(rankByQuality(webPool), input);
  const dated = filterSourcesByLookback(
    await enrichPoolPublishedDates(dedupeSources([...userSources, ...enrichedWeb]), input),
    input
  );

  if (dated.length === 0) {
    throw new Error(
      `No usable articles found for this topic in the last ${CUSTOM_WINDOW_DAYS} days. Add source links, or describe the topic with the company and product names.`
    );
  }

  const stories = await callAnthropicForStories(
    options.section,
    buildStoryGenerationPrompt(input, options.section, dated, { count: 1, authorBrief: brief }),
    1
  );
  if (stories.length === 0) throw new Error("Could not write a story from the sources found. Try again.");

  const sources = await ensureVerifiedStorySources(stories[0].sources, dated, stories[0].title, input);
  const story = sanitizeStory({ ...stories[0], section: options.section, sources });
  const realSources = story.sources.filter((source) => !source.is_synthesis && source.url);
  if (realSources.length === 0) {
    throw new Error("No verified articles could be attached to this topic. Add source links and try again.");
  }

  const claimChecks = await checkBriefClaims(plan.claims, realSources);

  story.sources = [
    ...story.sources,
    {
      url: "",
      title: AUTHOR_BRIEF_SOURCE_TITLE,
      excerpt: brief.slice(0, 600),
      extracted_facts: brief,
      is_synthesis: true,
      published_at: null,
    },
  ];

  return { story, claimChecks, articleCount: realSources.length, unreadableUrls };
}
