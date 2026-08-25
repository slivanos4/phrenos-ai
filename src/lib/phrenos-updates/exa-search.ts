import type { SourceLookback } from "@/lib/phrenos-updates/source-dates";

export type ExaSearchHit = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

export type ExaSearchResult = {
  sources: ExaSearchHit[];
  error?: string;
};

function isExaConfigured() {
  return Boolean(process.env.EXA_API_KEY?.trim());
}

/**
 * Exa web search used as a Tavily fallback for weekly Gen AI discovery.
 * Raw results + highlights only (no deep synthesis).
 */
export async function searchExaArticles(input: {
  query: string;
  lookback: SourceLookback;
  includeDomains?: readonly string[];
  maxResults?: number;
  preferNews?: boolean;
}): Promise<ExaSearchResult> {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) {
    return { sources: [], error: "EXA_API_KEY is not configured." };
  }

  const body: Record<string, unknown> = {
    query: input.query,
    type: "auto",
    numResults: Math.min(input.maxResults ?? 10, 20),
    startPublishedDate: input.lookback.lookbackStart,
    endPublishedDate: input.lookback.lookbackEnd,
    contents: {
      highlights: true,
    },
  };

  if (input.preferNews !== false) {
    body.category = "news";
  }

  if (input.includeDomains?.length) {
    body.includeDomains = [...input.includeDomains].slice(0, 20);
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Retry once without category if news category is rejected with filters.
      if (response.status === 400 && body.category === "news") {
        delete body.category;
        const retry = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(body),
        });
        if (!retry.ok) {
          const retryDetail = await retry.text().catch(() => "");
          return {
            sources: [],
            error: `Exa search failed (${retry.status}): ${retryDetail.slice(0, 240)}`,
          };
        }
        return {
          sources: mapExaPayload(await retry.json()),
        };
      }

      return {
        sources: [],
        error: `Exa search failed (${response.status}): ${detail.slice(0, 240)}`,
      };
    }

    return { sources: mapExaPayload(await response.json()) };
  } catch (error) {
    return {
      sources: [],
      error: error instanceof Error ? error.message : "Exa request failed.",
    };
  }
}

function mapExaPayload(data: unknown): ExaSearchHit[] {
  const payload = data as {
    results?: {
      title?: string;
      url?: string;
      publishedDate?: string | null;
      highlights?: string[];
      text?: string;
    }[];
  };

  return (payload.results ?? [])
    .filter((row) => Boolean(row.url))
    .map((row) => {
      const highlight = Array.isArray(row.highlights)
        ? row.highlights.filter(Boolean).join(" ").trim()
        : "";
      const content =
        highlight ||
        (typeof row.text === "string" ? row.text.trim() : "") ||
        (row.title ? `Article: ${row.title}` : "");

      return {
        title: row.title?.trim() || "Source",
        url: row.url,
        content: content.slice(0, 500),
        published_date: row.publishedDate ?? undefined,
      };
    });
}

export { isExaConfigured };
