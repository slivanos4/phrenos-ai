import {
  BRITISH_ENGLISH_BLOCK,
  EDITORIAL_PRECISION_BLOCK,
  LINKEDIN_VOICE_PATTERNS_BLOCK,
  PUNCHY_OPENING_BLOCK,
} from "@/lib/phrenos-updates/prompts";
import { sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import type {
  ChatGptSuggestion,
  GeneratedSource,
  ReviewableDraft,
  ReviewSuggestionType,
  SuggestionType,
} from "@/lib/phrenos-updates/types";

export type { ChatGptSuggestion, ReviewableDraft };

export type ChatGptReview = {
  model: string;
  overall: string;
  suggestions: ChatGptSuggestion[];
};

/** No default model is guaranteed to exist on every account, so this is the one thing worth setting. */
export const DEFAULT_OPENAI_REVIEW_MODEL = "gpt-5";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openAiReviewModel(): string {
  return process.env.OPENAI_REVIEW_MODEL?.trim() || DEFAULT_OPENAI_REVIEW_MODEL;
}

const SYSTEM_PROMPT = `You are an independent senior editor and proofreader. Another AI writer drafted the piece you are given, for Phrenos.ai (an AI consultancy, British English).

Review it for:
- proofreading: spelling, grammar, punctuation, typos, inconsistent terms, awkward phrasing
- clarity and flow: sentences that are hard to follow, repetition, weak transitions
- structure and tone against the HOUSE RULES supplied
- claims, checked ONLY against the SOURCE FACTS supplied

CRITICAL ABOUT FACTS: your own knowledge of events, products, models, companies, dates and names is out of date compared with the sources, which describe developments after your training. NEVER "correct" a fact, name, date, number or product or model name from your own knowledge, and never tell the writer a real product does not exist. Judge facts only against the SOURCE FACTS. If the draft states something the source facts do not support, flag it with type "unsupported_claim" and suggest removing or softening it. Do not supply a replacement fact from memory.

Be useful, not exhaustive: report only real issues, most important first, at most 12. Prefer small targeted fixes over rewrites. Do not praise.

Return ONLY JSON:
{"overall":"two sentences on the draft's overall quality and the single biggest issue","suggestions":[{"id":"s1","type":"proofread|clarity|structure|tone|house_rule|unsupported_claim","severity":"must|should|could","location":"a short quote (under 120 characters) of the passage","issue":"what is wrong","fix":"the specific change you suggest"}]}`;

function htmlToReadableText(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>/gi, "\n## ")
    .replace(/<\/(p|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function houseRulesFor(kind: SuggestionType): string {
  const common = `${BRITISH_ENGLISH_BLOCK}\n\n${EDITORIAL_PRECISION_BLOCK}\n\nNo em dashes or en dashes anywhere.`;
  if (kind === "linkedin") {
    return `${common}\n\n${PUNCHY_OPENING_BLOCK}\n\n${LINKEDIN_VOICE_PATTERNS_BLOCK}\n\nThe token [link] is a placeholder the publishing app replaces with the article URL. It is intentional, never flag it.`;
  }
  return `${common}\n\nBlog: strategic and evidence-led, tight rather than exhaustive, each theme said once, headings that sound like a strategist, no generic AI filler. The cta is a conversion moment that names what Phrenos.ai helps with and calls back to a concrete detail from the story.`;
}

/** Send one draft to ChatGPT for an independent proofread. Throws on API problems. */
export async function requestChatGptReview(input: {
  kind: SuggestionType;
  draft: ReviewableDraft;
  sources: GeneratedSource[];
}): Promise<ChatGptReview> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  const model = openAiReviewModel();

  const sourceFacts = input.sources
    .filter((source) => !source.is_synthesis && source.url)
    .slice(0, 15)
    .map((source) => ({
      title: source.title,
      published_at: source.published_at ?? null,
      facts: sourceFactsForPrompt(source).slice(0, 1200),
    }));

  const draftText =
    input.kind === "linkedin"
      ? [input.draft.hook, htmlToReadableText(input.draft.body_html), input.draft.cta]
          .filter(Boolean)
          .join("\n\n")
      : [
          `TITLE: ${input.draft.title}`,
          `HOOK: ${input.draft.hook}`,
          `BODY:\n${htmlToReadableText(input.draft.body_html)}`,
          `CTA: ${input.draft.cta}`,
        ].join("\n\n");

  const userContent = `DRAFT TYPE: ${input.kind === "linkedin" ? "LinkedIn post" : "Blog article"}

HOUSE RULES (check the draft against these):
${houseRulesFor(input.kind)}

SOURCE FACTS (the only ground truth for facts):
${JSON.stringify(sourceFacts, null, 2)}

DRAFT TO REVIEW:
${draftText}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150_000);
  let response: Response;
  try {
    const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 6000,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.name === "AbortError"
        ? "ChatGPT took too long to respond."
        : `Could not reach OpenAI: ${error instanceof Error ? error.message : "network error"}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(
      `OpenAI error (${response.status}) on model ${model}: ${detail}${
        response.status === 404 ? " Set OPENAI_REVIEW_MODEL to a model your account can use." : ""
      }`
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  let parsed: { overall?: unknown; suggestions?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("ChatGPT returned a review that could not be read.");
  }

  const types: ReviewSuggestionType[] = [
    "proofread",
    "clarity",
    "structure",
    "tone",
    "house_rule",
    "unsupported_claim",
  ];
  const suggestions: ChatGptSuggestion[] = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
    .map((raw, index): ChatGptSuggestion | null => {
      const item = raw as Record<string, unknown>;
      const issue = typeof item.issue === "string" ? item.issue.trim() : "";
      if (!issue) return null;
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `s${index + 1}`,
        type: types.includes(item.type as ReviewSuggestionType)
          ? (item.type as ReviewSuggestionType)
          : "clarity",
        severity:
          item.severity === "must" || item.severity === "could" ? item.severity : "should",
        location: typeof item.location === "string" ? item.location.trim().slice(0, 160) : "",
        issue,
        fix: typeof item.fix === "string" ? item.fix.trim() : "",
      };
    })
    .filter((item): item is ChatGptSuggestion => item !== null)
    .slice(0, 12);

  return {
    model,
    overall: typeof parsed.overall === "string" ? parsed.overall.trim() : "",
    suggestions,
  };
}
