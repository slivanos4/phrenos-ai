import {
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
  extractJsonArray,
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
import { resolveSourcePublishedDate, textClaimsDateOutsideLookback } from "@/lib/phrenos-updates/source-dates";
import {
  buildSummaryFromExcerpts,
  ensurePolishedSummaries,
  normalizeStoryTitle,
  polishSummary,
} from "@/lib/phrenos-updates/story-summary";
import { enrichSourcesWithFirecrawl } from "@/lib/phrenos-updates/source-enrichment";
import {
  discoveryQueriesForSection,
  tavilyBodyForQuery,
  tavilyMinimalBody,
  tavilyQueriesForSection,
  type TavilySearchOptions,
} from "@/lib/phrenos-updates/research-discovery";

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
function buildStoryGenerationPrompt(
  input: ResearchAgentInput,
  section: ResearchSection,
  webSources: GeneratedSource[]
): string {
  const sourceRules =
    webSources.length > 0
      ? `  * Each source MUST be a specific article from the "Web articles found" list below
  * Copy the exact url, title, and published_at from that list. Do NOT invent URLs or dates
  * published_at is required for every real article and MUST fall within ${input.lookbackStart} to ${input.lookbackEnd} (the past two weeks). Reject anything older or undated
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
Generate exactly ${MAX_STORIES_PER_SECTION} distinct news stories as a JSON array from the articles below. Each story must cover a different article or trend. Prioritise stories that are strategically significant, surprising, or eye-opening when the sources support that. When the desk brief suggests an angle, prefer matching in-period articles from the list if they exist — never invent facts from the brief alone.

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
${JSON.stringify(webSources.slice(0, 12), null, 2)}

Return ONLY valid JSON array, no markdown fences or commentary.`;
}

function storyClaimsStalePeriod(story: GeneratedStory, input: ResearchAgentInput): boolean {
  const haystack = `${story.title}\n${story.summary_html}\n${story.sources
    .map((source) => `${source.title} ${source.excerpt}`)
    .join("\n")}`;
  return textClaimsDateOutsideLookback(haystack, input);
}

function keepInPeriodStories(
  stories: GeneratedStory[],
  input: ResearchAgentInput
): GeneratedStory[] {
  return stories.filter((story) => {
    if (storyClaimsStalePeriod(story, input)) {
      console.warn(`Dropping out-of-period story: ${story.title}`);
      return false;
    }
    const datedSources = story.sources.filter(
      (source) =>
        !source.is_synthesis &&
        source.published_at &&
        !textClaimsDateOutsideLookback(source.published_at, input)
    );
    return datedSources.length > 0 || story.sources.every((source) => source.is_synthesis);
  });
}

async function callAnthropicForStories(
  section: ResearchSection,
  prompt: string
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
    .slice(0, MAX_STORIES_PER_SECTION)
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

async function fetchTavilyContext(
  options: TavilySearchOptions | string,
  input: ResearchAgentInput
): Promise<GeneratedSource[]> {
  const result = await fetchTavilyContextDetailed(options, input);
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
    queries.map((query) => fetchTavilyContextDetailed(query, input))
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

async function generateSectionStories(
  input: ResearchAgentInput,
  section: ResearchSection,
  webSources: GeneratedSource[]
): Promise<GeneratedStory[]> {
  if (webSources.length === 0) return [];

  try {
    const stories = await callAnthropicForStories(
      section,
      buildStoryGenerationPrompt(input, section, webSources)
    );

    if (stories.length > 0) {
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

  return buildStoriesFromPool(section, input, webSources);
}

export async function runResearchAgent(input: ResearchAgentInput): Promise<GeneratedStory[]> {
  const hasLlm = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasSearch = Boolean(process.env.TAVILY_API_KEY?.trim());

  if (!hasLlm || !hasSearch) {
    throw new Error(
      "Research requires both ANTHROPIC_API_KEY and TAVILY_API_KEY. Add both to your environment, redeploy, then re-run."
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
        "Tavily returned no recent article URLs. Check TAVILY_API_KEY is valid on Vercel, redeploy, then re-run."
    );
  }

  const [enrichedModelsPool, enrichedProductsPool] = await Promise.all([
    enrichSourcesWithFirecrawl(modelsPool, input),
    enrichSourcesWithFirecrawl(productsPool, input),
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
    generateSectionStories(input, "models_research", datedModelsPool),
    generateSectionStories(input, "products_industry", datedProductsPool),
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
