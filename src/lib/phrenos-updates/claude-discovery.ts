import { callAnthropicSafe, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import {
  AI_NEWS_DOMAINS,
  type DiscoveryLookback,
  type TavilySearchOptions,
} from "@/lib/phrenos-updates/research-discovery";
import type { ResearchSection } from "@/lib/phrenos-updates/types";
import { SECTION_LABELS } from "@/lib/phrenos-updates/types";

export type ClaudeDiscoveryPlan = {
  queries: TavilySearchOptions[];
  domains: string[];
};

function normalizeDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed || !trimmed.includes(".")) return null;
  return trimmed.replace(/^www\./, "");
}

/**
 * Ask Claude for fresh search queries and publisher domains for this week's section.
 * Tavily still does the live fetch; Claude steers where to look.
 */
export async function proposeClaudeDiscoverySearches(
  section: ResearchSection,
  input: DiscoveryLookback
): Promise<ClaudeDiscoveryPlan> {
  const prompt = `You are the research desk lead for Phrenos.ai's weekly Gen AI news brief.

Propose live web searches for the last two weeks only.
Period: ${input.lookbackStart} to ${input.lookbackEnd}
Section: ${SECTION_LABELS[section]}

Return ONLY JSON:
{
  "queries": ["short news search query 1", "query 2", "query 3", "query 4"],
  "domains": ["publisher.com", "another-outlet.com"]
}

Rules:
- 4 queries, specific to recent generative AI news in this section
- Prefer queries that surface primary reporting, official blogs, and serious AI desks
- domains: up to 8 trustworthy publishers likely to have coverage this week (no social networks)
- Do not invent article URLs
- Do not include months outside the research period in the queries
- Known good starting points include: artificialintelligence-news.com, aiweekly.co, techcrunch.com, theverge.com, wired.com, reuters.com, technologyreview.com, openai.com, anthropic.com, huggingface.co`;

  const text = await callAnthropicSafe(prompt, 900);
  const json = text ? extractJsonObject(text) : null;
  if (!json) {
    return { queries: [], domains: [...AI_NEWS_DOMAINS].slice(0, 8) };
  }

  try {
    const parsed = JSON.parse(json) as {
      queries?: unknown;
      domains?: unknown;
    };
    const queryStrings = Array.isArray(parsed.queries)
      ? parsed.queries
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length >= 12)
          .slice(0, 4)
      : [];
    const domains = Array.isArray(parsed.domains)
      ? parsed.domains
          .filter((item): item is string => typeof item === "string")
          .map(normalizeDomain)
          .filter((item): item is string => Boolean(item))
          .slice(0, 8)
      : [];

    const queries: TavilySearchOptions[] = queryStrings.map((query, index) => ({
      query,
      topic: index % 2 === 0 ? "news" : "general",
      maxResults: 8,
      includeDomains: domains.length > 0 && index === 0 ? domains : undefined,
    }));

    return {
      queries,
      domains: domains.length > 0 ? domains : [...AI_NEWS_DOMAINS].slice(0, 8),
    };
  } catch {
    return { queries: [], domains: [...AI_NEWS_DOMAINS].slice(0, 8) };
  }
}
