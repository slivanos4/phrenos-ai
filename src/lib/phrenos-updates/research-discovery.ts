import type { ResearchSection } from "@/lib/phrenos-updates/types";
import type { ResearchAgentInput } from "@/lib/phrenos-updates/research-agent";
import { LOOKBACK_DAYS } from "@/lib/phrenos-updates/source-dates";

/**
 * High-signal AI news domains. Used for targeted Tavily include_domains searches.
 * Keep this list focused so results stay sharp.
 */
export const AI_NEWS_DOMAINS = [
  "artificialintelligence-news.com",
  "aiweekly.co",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "technologyreview.com",
  "reuters.com",
  "bloomberg.com",
  "venturebeat.com",
  "huggingface.co",
  "openai.com",
  "anthropic.com",
  "deepmind.google",
  "blog.google",
  "aws.amazon.com",
] as const;

/** Broader set used only for ranking boosts after open news search. */
export const AI_NEWS_DOMAIN_BOOST = [
  ...AI_NEWS_DOMAINS,
  "ft.com",
  "theinformation.com",
  "semafor.com",
  "axios.com",
  "zdnet.com",
  "cnet.com",
  "engadget.com",
  "blogs.microsoft.com",
  "nvidia.com",
  "arxiv.org",
] as const;

export function domainNewsBoost(url: string): number {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if ((AI_NEWS_DOMAINS as readonly string[]).includes(host)) return 3;
    if ((AI_NEWS_DOMAIN_BOOST as readonly string[]).includes(host)) return 1;
    return 0;
  } catch {
    return 0;
  }
}

export type TavilySearchOptions = {
  query: string;
  includeDomains?: readonly string[];
  topic?: "general" | "news";
  maxResults?: number;
};

/** Build a diverse query pack so discovery is not stuck on one generic search. */
export function discoveryQueriesForSection(
  section: ResearchSection,
  input: ResearchAgentInput
): TavilySearchOptions[] {
  const { lookbackStart, lookbackEnd } = input;
  const window = `${lookbackStart} to ${lookbackEnd}`;

  if (section === "models_research") {
    return [
      {
        query: `latest generative AI model releases benchmarks reasoning multimodal ${lookbackEnd}`,
        topic: "news",
        maxResults: 12,
      },
      {
        query: `OpenAI Anthropic Google DeepMind Meta new LLM model research paper ${window}`,
        topic: "news",
        maxResults: 10,
      },
      {
        query: `open source LLM weights Mistral Llama Qwen benchmark evaluation ${lookbackEnd}`,
        topic: "news",
        maxResults: 8,
      },
      {
        query: `site:artificialintelligence-news.com AI model research benchmark`,
        topic: "news",
        includeDomains: ["artificialintelligence-news.com"],
        maxResults: 10,
      },
      {
        query: `site:aiweekly.co AI models research ethics frontier labs`,
        topic: "news",
        includeDomains: ["aiweekly.co"],
        maxResults: 8,
      },
      {
        query: `generative AI research breakthrough agentic multimodal ${window}`,
        topic: "general",
        includeDomains: AI_NEWS_DOMAINS,
        maxResults: 12,
      },
    ];
  }

  return [
    {
      query: `generative AI product launch enterprise agentic tools OpenAI Anthropic Google ${lookbackEnd}`,
      topic: "news",
      maxResults: 12,
    },
    {
      query: `AI business strategy regulation enterprise adoption security ${window}`,
      topic: "news",
      maxResults: 10,
    },
    {
      query: `AI agents enterprise workflow automation product launch ${lookbackEnd}`,
      topic: "news",
      maxResults: 8,
    },
    {
      query: `site:artificialintelligence-news.com AI business strategy product launch agents`,
      topic: "news",
      includeDomains: ["artificialintelligence-news.com"],
      maxResults: 10,
    },
    {
      query: `site:aiweekly.co AI news enterprise regulation`,
      topic: "news",
      includeDomains: ["aiweekly.co"],
      maxResults: 8,
    },
    {
      query: `AI industry news product launch regulation enterprise ${window}`,
      topic: "general",
      includeDomains: AI_NEWS_DOMAINS,
      maxResults: 12,
    },
  ];
}

export function tavilyBodyForQuery(
  options: TavilySearchOptions,
  input: ResearchAgentInput,
  apiKey: string
): Record<string, unknown> {
  const topic = options.topic ?? "news";
  const body: Record<string, unknown> = {
    api_key: apiKey,
    query: options.query,
    search_depth: "advanced",
    max_results: options.maxResults ?? 10,
    include_answer: false,
    topic,
    start_date: input.lookbackStart,
    end_date: input.lookbackEnd,
  };

  if (topic === "news") {
    body.days = LOOKBACK_DAYS;
  } else {
    body.time_range = "week";
  }

  if (options.includeDomains?.length) {
    body.include_domains = [...options.includeDomains];
  }

  return body;
}

/** Back-compat shape used by older call sites / docs. */
export function tavilyQueriesForSection(
  section: ResearchSection,
  input: ResearchAgentInput
): { primary: string; fallback: string } {
  const pack = discoveryQueriesForSection(section, input);
  return {
    primary: pack[0]?.query ?? `generative AI news ${input.lookbackEnd}`,
    fallback: pack[1]?.query ?? `AI industry updates ${input.lookbackEnd}`,
  };
}
