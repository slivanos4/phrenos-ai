import { callAnthropic, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { enforceSourceVerifiedDraft } from "@/lib/phrenos-updates/draft-verify";
import {
  isOpenAiConfigured,
  requestChatGptReview,
  type ChatGptReview,
} from "@/lib/phrenos-updates/openai-review";
import { loadStoryForContent } from "@/lib/phrenos-updates/run-research";
import { countWords, normalizePresentationHtml, sanitizeEditorialText } from "@/lib/phrenos-updates/sanitize";
import { sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import { authorBriefFor } from "@/lib/phrenos-updates/story-content-pack";
import { cleanSuggestionFields, meetsLengthTarget } from "@/lib/phrenos-updates/suggestion-quality";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";
import type {
  DraftReviewReport,
  DraftReviewResult,
  GeneratedStory,
  GeneratedSuggestion,
  ReviewableDraft,
  ReviewItem,
  StoryReviewOutcome,
  SuggestionType,
} from "@/lib/phrenos-updates/types";

const LINKEDIN_HARD_MAX_WORDS = 270;

// Each request has 300 seconds. A blog needs roughly 160 of them for Claude's revision and the
// fact-check, so stop early with a clear message instead of being cut off mid-way.
const MAX_SECONDS_BEFORE_REVISION = 110;
const MAX_SECONDS_BEFORE_FACT_CHECK = 200;

type SuggestionRow = {
  id: string;
  story_id: string;
  suggestion_type: SuggestionType;
  status: string;
  is_full_draft: boolean;
  title: string;
  hook: string;
  body_html: string;
  cta: string;
  hashtags: string;
  image_ideas: string;
};

function draftWords(kind: SuggestionType, draft: ReviewableDraft): number {
  return kind === "linkedin"
    ? countWords(`${draft.hook} ${draft.body_html} ${draft.cta}`.replace(/\[link\]/gi, ""))
    : countWords(draft.body_html);
}

function sourcePacket(story: GeneratedStory) {
  return story.sources
    .filter((source) => !source.is_synthesis && source.url)
    .slice(0, 15)
    .map((source) => ({
      title: source.title,
      published_at: source.published_at ?? null,
      facts: sourceFactsForPrompt(source).slice(0, 1200),
    }));
}

/** Claude, the author, studies ChatGPT's feedback and decides what to apply. */
async function reviseWithFeedback(input: {
  kind: SuggestionType;
  story: GeneratedStory;
  current: ReviewableDraft;
  review: ChatGptReview;
}): Promise<{
  decisions: { id: string; decision: ReviewItem["decision"]; reason: string }[];
  revised: ReviewableDraft;
} | null> {
  const brief = authorBriefFor(input.story);
  const prompt = `You wrote the ${input.kind === "linkedin" ? "LinkedIn post" : "blog article"} below for Phrenos.ai. An independent editor (ChatGPT) reviewed it. You are the author and you make the decisions.

For EVERY suggestion choose one:
- "accepted": apply it as suggested
- "adapted": the problem is real but your own fix is better, apply that
- "rejected": leave that part unchanged
Give a one-sentence reason for each.

Rules:
- Make minimal edits. Keep everything that works. Do not rewrite wholesale and do not change the argument or the structure.
- The SOURCE FACTS are the only ground truth. Never add a fact, number, name, date or quote that is not in them. The editor's knowledge is out of date, so REJECT any suggestion that would change a fact the source facts support, and reject any suggestion that would introduce a new fact.
- For "unsupported_claim" suggestions: remove or soften the claim unless the source facts do support it.
- Keep British English. No em dashes or en dashes.
${
  input.kind === "linkedin"
    ? `- LinkedIn: keep the paragraph containing only [link] and the pointer line before it exactly as they are. The cta stays a single closing question. Stay at 250 words or fewer. No hashtags in the body. Keep each paragraph in its own <p>.`
    : `- Blog: keep the <h2> structure and stay at 1,200 words or more. Use only <p>, <h2>, <ul>, <li> and <strong>.`
}${brief ? `\n- This piece follows the author's brief and must stay on it:\n"""\n${brief}\n"""` : ""}

SOURCE FACTS:
${JSON.stringify(sourcePacket(input.story), null, 2)}

YOUR DRAFT:
${JSON.stringify(input.current, null, 2)}

THE EDITOR'S REVIEW:
${JSON.stringify(input.review, null, 2)}

Return ONLY JSON:
{"decisions":[{"id":"s1","decision":"accepted","reason":"..."}],"revised":{"title":"...","hook":"...","body_html":"...","cta":"..."}}
"revised" must be the COMPLETE draft with your accepted and adapted changes applied (unchanged fields repeated as they are).`;

  const text = await callAnthropic(prompt, input.kind === "blog" ? 16000 : 4000);
  const json = extractJsonObject(text);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as {
      decisions?: { id?: unknown; decision?: unknown; reason?: unknown }[];
      revised?: Partial<ReviewableDraft>;
    };
    const revised = parsed.revised;
    if (!revised || typeof revised.body_html !== "string" || !revised.body_html.trim()) return null;
    return {
      decisions: (parsed.decisions ?? []).map((item) => ({
        id: String(item.id ?? ""),
        decision:
          item.decision === "accepted" || item.decision === "adapted" ? item.decision : "rejected",
        reason: typeof item.reason === "string" ? item.reason.trim() : "",
      })),
      revised: {
        title: typeof revised.title === "string" && revised.title.trim() ? revised.title : input.current.title,
        hook: typeof revised.hook === "string" ? revised.hook : input.current.hook,
        body_html: revised.body_html,
        cta: typeof revised.cta === "string" && revised.cta.trim() ? revised.cta : input.current.cta,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Claude writes, ChatGPT proofreads and suggests, Claude studies the feedback and amends.
 * A revision is only saved if it keeps the structure, stays in length and passes the source fact-check.
 */
export async function reviewAndImproveSuggestion(suggestionId: string): Promise<DraftReviewResult> {
  const startedAt = Date.now();
  const secondsSince = () => (Date.now() - startedAt) / 1000;

  if (!isOpenAiConfigured()) {
    return {
      skipped: true,
      reason: "ChatGPT proofreading is off. Add OPENAI_API_KEY (and optionally OPENAI_REVIEW_MODEL) to turn it on.",
    };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as SuggestionRow | null;
  if (!row) throw new Error("Draft not found.");
  if (!row.is_full_draft) return { skipped: true, reason: "Only full drafts are proofread, not ideas." };
  if (row.status === "published") {
    return { skipped: true, reason: "This draft is published. Unpublish it before proofreading." };
  }

  const story = await loadStoryForContent(row.story_id);
  if (!story) throw new Error("Story not found.");

  const kind = row.suggestion_type;
  const previous: ReviewableDraft = {
    title: row.title,
    hook: row.hook,
    body_html: row.body_html,
    cta: row.cta,
  };
  const wordsBefore = draftWords(kind, previous);

  const review = await requestChatGptReview({ kind, draft: previous, sources: story.sources });
  const base = {
    suggestionId: row.id,
    kind,
    title: row.title,
    model: review.model,
    overall: review.overall,
    previous,
    wordsBefore,
  };
  const unchanged = (note: string, items: ReviewItem[]): DraftReviewResult => ({
    skipped: false,
    report: { ...base, applied: false, note, items, current: previous, wordsAfter: wordsBefore },
  });
  const asRejected = (reason: string): ReviewItem[] =>
    review.suggestions.map((item) => ({ ...item, decision: "rejected", reason }));

  if (review.suggestions.length === 0) {
    return unchanged("ChatGPT found nothing to change.", []);
  }

  if (secondsSince() > MAX_SECONDS_BEFORE_REVISION) {
    return unchanged(
      "ChatGPT took too long this time to leave room for Claude's revision. Press Proofread again.",
      asRejected("Not reached.")
    );
  }

  const revision = await reviseWithFeedback({ kind, story, current: previous, review });
  if (!revision) {
    return unchanged("Claude could not turn the feedback into a clean revision, so the draft is unchanged.", asRejected("No revision was produced."));
  }

  const items: ReviewItem[] = review.suggestions.map((item) => {
    const decision = revision.decisions.find((entry) => entry.id === item.id);
    return {
      ...item,
      decision: decision?.decision ?? "rejected",
      reason: decision?.reason || "No decision recorded.",
    };
  });
  if (!items.some((item) => item.decision !== "rejected")) {
    return unchanged("Claude reviewed every suggestion and kept the draft as it was.", items);
  }

  const cleaned = cleanSuggestionFields({
    ...(row as unknown as GeneratedSuggestion),
    ...revision.revised,
    is_full_draft: true,
  });
  if (!cleaned) return unchanged("The revision came back too short or low quality, so the draft is unchanged.", items);

  // Guards: a revision must not break the structure or shrink the piece.
  const revisedDraft: ReviewableDraft = {
    title: cleaned.title,
    hook: cleaned.hook,
    body_html: cleaned.body_html,
    cta: cleaned.cta,
  };
  const wordsRevised = draftWords(kind, revisedDraft);
  if (kind === "linkedin") {
    if (/\[link\]/i.test(previous.body_html) && !/\[link\]/i.test(revisedDraft.body_html)) {
      return unchanged("The revision dropped the article link placeholder, so the draft is unchanged.", items);
    }
    if (/\?\s*$/.test(previous.cta) && !/\?\s*$/.test(revisedDraft.cta)) {
      return unchanged("The revision lost the closing question, so the draft is unchanged.", items);
    }
    if (wordsRevised > LINKEDIN_HARD_MAX_WORDS) {
      return unchanged(`The revision ran to ${wordsRevised} words, over the LinkedIn limit, so the draft is unchanged.`, items);
    }
  } else if (!meetsLengthTarget({ ...cleaned, suggestion_type: "blog" }) || wordsRevised < wordsBefore * 0.85) {
    return unchanged("The revision cut too much of the article, so the draft is unchanged.", items);
  }

  if (secondsSince() > MAX_SECONDS_BEFORE_FACT_CHECK) {
    return unchanged(
      "The revision ran out of time before it could be fact-checked, so the draft is unchanged. Press Proofread again.",
      items
    );
  }

  const verified = await enforceSourceVerifiedDraft(story, { ...cleaned, suggestion_type: kind, is_full_draft: true });
  if (!verified) {
    return unchanged("The revision failed the source fact-check, so the draft is unchanged.", items);
  }

  const current: ReviewableDraft = {
    title: sanitizeEditorialText(verified.title),
    hook: sanitizeEditorialText(verified.hook),
    body_html: normalizePresentationHtml(sanitizeEditorialText(verified.body_html)),
    cta: sanitizeEditorialText(verified.cta),
  };

  const { error: updateError } = await supabase
    .from(SUGGESTIONS_TABLE)
    .update({ ...current, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (updateError) throw new Error(updateError.message);

  const applied = items.filter((item) => item.decision !== "rejected").length;
  return {
    skipped: false,
    report: {
      ...base,
      applied: true,
      note: `Claude applied ${applied} of ${items.length} suggestions.`,
      items,
      current,
      wordsAfter: draftWords(kind, current),
    },
  };
}

/** Proofread a story's featured blog and LinkedIn drafts in parallel. */
export async function reviewStoryFeaturedDrafts(storyId: string): Promise<StoryReviewOutcome[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("id, suggestion_type, status")
    .eq("story_id", storyId)
    .eq("is_full_draft", true);
  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? [])
      .filter((row) => row.status !== "published")
      .map(async (row): Promise<StoryReviewOutcome> => {
        try {
          return {
            suggestionId: row.id as string,
            kind: row.suggestion_type as SuggestionType,
            result: await reviewAndImproveSuggestion(row.id as string),
          };
        } catch (cause) {
          return {
            suggestionId: row.id as string,
            kind: row.suggestion_type as SuggestionType,
            error: cause instanceof Error ? cause.message : "Review failed.",
          };
        }
      })
  );
}
