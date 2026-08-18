export function formatApiError(message: string): { error: string; status: number } {
  const lower = message.toLowerCase();

  if (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  ) {
    return {
      error:
        "Database tables are missing. In the Supabase SQL Editor, run supabase/migrations/001_phrenos_updates.sql, then try again.",
      status: 503,
    };
  }

  if (lower.includes("supabase_service_role_key") || lower.includes("supabase_url")) {
    return {
      error: "Supabase environment variables are not set for this deployment.",
      status: 503,
    };
  }

  if (lower.includes("credit balance") || lower.includes("plans & billing")) {
    return {
      error:
        "Anthropic API credits are exhausted. Open console.anthropic.com, Plans and Billing, add credits, then click Generate content or re-run this week.",
      status: 503,
    };
  }

  if (lower.includes("tavily_api_key") || lower.includes("tavily search failed")) {
    return {
      error: "Tavily search is unavailable. Check TAVILY_API_KEY, redeploy, then re-run.",
      status: 503,
    };
  }

  if (lower.includes("anthropic api error")) {
    return {
      error: message.replace(/^Anthropic API error \(\d+\)[^:]*: /, "Anthropic: ").slice(0, 280),
      status: 503,
    };
  }

  return { error: message, status: 500 };
}

export function errorResponse(message: string, status = 500) {
  const formatted = formatApiError(message);
  return { body: { error: formatted.error }, status: formatted.status ?? status };
}
