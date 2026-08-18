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
import { SOURCE_INTEGRITY_BLOCK, STORY_SUMMARY_RULES } from "@/lib/phrenos-updates/prompts";
import {
  dedupeSources,
  ensureStorySources,
  ensureVerifiedStorySources,
  filterSourcesByLookback,
  isSpecificArticleUrl,
} from "@/lib/phrenos-updates/research-sources";
import { resolveSourcePublishedDate } from "@/lib/phrenos-updates/source-dates";
import {
  buildSummaryFromExcerpts,
  ensurePolishedSummaries,
  normalizeStoryTitle,
  polishSummary,
} from "@/lib/phrenos-updates/story-summary";
import { enrichSourcesWithFirecrawl } from "@/lib/phrenos-updates/source-enrichment";

export type { GeneratedSource, GeneratedStory, GeneratedSuggestion };

export type ResearchAgentInput = {
  lookbackStart: string;
  lookbackEnd: string;
};

/** Doc section 6: Tavily discovery queries. */
export function tavilyQueriesForSection(
  section: ResearchSection,
  input: ResearchAgentInput
): { primary: string; fallback: string } {
  if (section === "models_research") {
    return {
      primary: `generative AI new model release benchmark LLM reasoning multimodal research ${input.lookbackEnd}`,
      fallback: `LLM open source weights Mistral LLaMA benchmark ${input.lookbackEnd}`,
    };
  }

  return {
    primary: `generative AI product launch feature agentic AI OpenAI Anthropic Google enterprise ${input.lookbackEnd}`,
    fallback: `AI regulation EU AI Act enterprise adoption generative AI news ${input.lookbackEnd}`,
  };
}

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
  const title = sanitizeDashes(story.title ?? "");
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
      title: sanitizeDashes(suggestion.title ?? ""),
      hook: sanitizeDashes(suggestion.hook ?? ""),
      body_html: sanitizeDashes(suggestion.body_html ?? ""),
      cta: sanitizeDashes(suggestion.cta ?? ""),
      hashtags: sanitizeDashes(suggestion.hashtags ?? ""),
      image_ideas: sanitizeDashes(suggestion.image_ideas ?? ""),
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
  * published_at must fall within the research period (${input.lookbackStart} to ${input.lookbackEnd}) or at most 14 days before ${input.lookbackEnd}
  * NEVER use homepage, section index, or domain-root links
  * NEVER use Instagram, Facebook, Twitter/X, TikTok, or LinkedIn post URLs. Use publisher articles, official company blogs, and research coverage only
  * Use is_synthesis:true ONLY when no listed article supports a minor point; max one synthesis source per story`
      : `  * No web articles were retrieved. Use is_synthesis:true for sources and keep the summary to general context only.`;

  return `You are a generative AI industry research analyst for Phrenos.ai (phrenosai.com), founded by Sophia Livanos. Your readers are leaders, strategists, and practitioners who need signal, not hype.

Period: ${input.lookbackStart} to ${input.lookbackEnd}.
Section: ${SECTION_LABELS[section]}

${SOURCE_INTEGRITY_BLOCK}

Generate exactly ${MAX_STORIES_PER_SECTION} distinct news stories as a JSON array from the articles below. Each story must cover a different article or trend. Prioritise stories that are strategically significant, surprising, or eye-opening when the sources support that.

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

async function fetchTavilyContext(
  query: string,
  input: ResearchAgentInput,
  options?: { throwOnError?: boolean }
): Promise<GeneratedSource[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 10,
      days: 14,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const detail = await readApiError(response);
    if (options?.throwOnError) {
      throw new Error(`Tavily search failed (${response.status}): ${detail}`);
    }
    console.error(`Tavily search failed (${response.status}): ${detail}`);
    return [];
  }

  const data = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string; published_date?: string }[];
  };

  return filterSourcesByLookback(
    dedupeSources(
      (data.results ?? [])
        .filter((row) => row.url && isSpecificArticleUrl(row.url))
        .map((row) =>
          sanitizeSourceFields({
            url: row.url ?? "",
            title: row.title ?? "Source",
            excerpt: (row.content ?? "").slice(0, 500),
            published_at: resolveSourcePublishedDate(
              row.url ?? "",
              row.published_date,
              null,
              `${row.title ?? ""} ${row.content ?? ""}`
            ),
            is_synthesis: false,
          })
        )
    ),
    input
  );
}

async function fetchSectionSources(
  section: ResearchSection,
  input: ResearchAgentInput
): Promise<GeneratedSource[]> {
  const queries = tavilyQueriesForSection(section, input);
  const primary = await fetchTavilyContext(queries.primary, input);
  if (primary.length >= 4) return primary;

  const fallback = await fetchTavilyContext(queries.fallback, input);
  return dedupeSources([...primary, ...fallback]);
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
        `"${story.title}" generative AI LLM ${input.lookbackStart} ${input.lookbackEnd}`,
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

  const [modelsPool, productsPool] = await Promise.all([
    fetchSectionSources("models_research", input),
    fetchSectionSources("products_industry", input),
  ]);

  if (modelsPool.length === 0 && productsPool.length === 0) {
    throw new Error(
      "Tavily returned no recent article URLs. Check TAVILY_API_KEY is valid, redeploy after env changes, then re-run."
    );
  }

  const [enrichedModelsPool, enrichedProductsPool] = await Promise.all([
    enrichSourcesWithFirecrawl(modelsPool),
    enrichSourcesWithFirecrawl(productsPool),
  ]);

  const [modelStories, productStories] = await Promise.all([
    generateSectionStories(input, "models_research", enrichedModelsPool),
    generateSectionStories(input, "products_industry", enrichedProductsPool),
  ]);

  if (modelStories.length === 0 && productStories.length === 0) {
    throw new Error(
      `Live research returned no stories (model: ${ANTHROPIC_MODEL}). Check ANTHROPIC_API_KEY, redeploy after env changes, then re-run.`
    );
  }

  const [enrichedModelStories, enrichedProductStories] = await Promise.all([
    enrichStoriesWithSources(modelStories, enrichedModelsPool, input),
    enrichStoriesWithSources(productStories, enrichedProductsPool, input),
  ]);

  return ensurePolishedSummaries([...enrichedModelStories, ...enrichedProductStories]);
}
