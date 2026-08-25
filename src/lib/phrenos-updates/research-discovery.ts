import type { ResearchSection } from "@/lib/phrenos-updates/types";
import { LOOKBACK_DAYS } from "@/lib/phrenos-updates/source-dates";

export type DiscoveryLookback = {
  lookbackStart: string;
  lookbackEnd: string;
};

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
  input: DiscoveryLookback
): TavilySearchOptions[] {
  const { lookbackEnd } = input;

  if (section === "models_research") {
    return [
      {
        query: `generative AI model release this week LLM OpenAI Anthropic Google DeepMind`,
        topic: "news",
        maxResults: 12,
      },
      {
        query: `new AI model launch benchmark reasoning multimodal past week`,
        topic: "news",
        maxResults: 10,
      },
      {
        query: `open source LLM release Mistral Llama Qwen ${lookbackEnd}`,
        topic: "news",
        maxResults: 8,
      },
      {
        query: `AI model research news this week`,
        topic: "news",
        includeDomains: ["artificialintelligence-news.com", "aiweekly.co", "techcrunch.com"],
        maxResults: 10,
      },
      {
        query: `generative AI research breakthrough agentic multimodal ${lookbackEnd}`,
        topic: "general",
        includeDomains: [
          "artificialintelligence-news.com",
          "aiweekly.co",
          "techcrunch.com",
          "theverge.com",
          "wired.com",
          "arstechnica.com",
          "technologyreview.com",
          "huggingface.co",
          "openai.com",
          "anthropic.com",
        ],
        maxResults: 12,
      },
      {
        query: `latest generative AI model news last two weeks`,
        topic: "news",
        maxResults: 12,
      },
    ];
  }

  return [
    {
      query: `generative AI product launch enterprise agents this week OpenAI Anthropic Google`,
      topic: "news",
      maxResults: 12,
    },
    {
      query: `AI regulation enterprise adoption security product news past week`,
      topic: "news",
      maxResults: 10,
    },
    {
      query: `AI agents enterprise workflow automation launch ${lookbackEnd}`,
      topic: "news",
      maxResults: 8,
    },
    {
      query: `AI business strategy product launch agents this week`,
      topic: "news",
      includeDomains: [
        "artificialintelligence-news.com",
        "aiweekly.co",
        "techcrunch.com",
        "reuters.com",
      ],
      maxResults: 10,
    },
    {
      query: `AI industry news product launch regulation enterprise ${lookbackEnd}`,
      topic: "general",
      includeDomains: [
        "artificialintelligence-news.com",
        "aiweekly.co",
        "techcrunch.com",
        "theverge.com",
        "reuters.com",
        "bloomberg.com",
        "venturebeat.com",
        "wired.com",
      ],
      maxResults: 12,
    },
    {
      query: `latest generative AI industry news last two weeks`,
      topic: "news",
      maxResults: 12,
    },
  ];
}

/**
 * Build a Tavily request body.
 * Use either start_date/end_date OR time_range/days — never stack them
 * (Tavily docs: conflicting date knobs return weak or empty results).
 */
export function tavilyBodyForQuery(
  options: TavilySearchOptions,
  input: DiscoveryLookback,
  apiKey: string,
  mode: "full" | "minimal" = "full"
): Record<string, unknown> {
  const topic = options.topic ?? "news";
  const body: Record<string, unknown> = {
    api_key: apiKey,
    query: options.query,
    search_depth: "advanced",
    max_results: Math.min(options.maxResults ?? 10, 20),
    include_answer: false,
    topic,
  };

  if (mode === "full") {
    if (topic === "news") {
      // News topic supports precise day lookback — matches our 14-day window.
      body.days = LOOKBACK_DAYS;
    } else {
      body.start_date = input.lookbackStart;
      body.end_date = input.lookbackEnd;
    }
    if (options.includeDomains?.length) {
      body.include_domains = [...options.includeDomains];
    }
  }

  return body;
}

/** Ultra-simple body used as a last-resort retry when full params fail. */
export function tavilyMinimalBody(
  query: string,
  apiKey: string
): Record<string, unknown> {
  return {
    api_key: apiKey,
    query,
    search_depth: "basic",
    max_results: 12,
    include_answer: false,
    topic: "news",
    days: LOOKBACK_DAYS,
  };
}

/** Back-compat shape used by older call sites / docs. */
export function tavilyQueriesForSection(
  section: ResearchSection,
  input: DiscoveryLookback
): { primary: string; fallback: string } {
  const pack = discoveryQueriesForSection(section, input);
  return {
    primary: pack[0]?.query ?? `generative AI news ${input.lookbackEnd}`,
    fallback: pack[1]?.query ?? `AI industry updates ${input.lookbackEnd}`,
  };
}

export { LOOKBACK_DAYS };
