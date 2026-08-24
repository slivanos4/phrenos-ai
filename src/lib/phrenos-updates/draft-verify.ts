import { callAnthropicSafe, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { SOURCE_INTEGRITY_BLOCK } from "@/lib/phrenos-updates/prompts";
import { sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import {
  cleanSuggestionFields,
  hasNewsWireTitle,
  hasOffVoiceMarkers,
  hasWeakCta,
  isLowQualitySuggestionBody,
  meetsLengthTarget,
} from "@/lib/phrenos-updates/suggestion-quality";
import type { GeneratedStory, GeneratedSuggestion } from "@/lib/phrenos-updates/types";
import { sanitizeDashes } from "@/lib/phrenos-updates/sanitize";

type VerifyResult = {
  supported: boolean;
  unsupported_claims: string[];
  revised: GeneratedSuggestion | null;
};

function sourcePacket(story: GeneratedStory) {
  return story.sources
    .filter((source) => !source.is_synthesis && source.url)
    .map((source) => ({
      url: source.url,
      title: source.title,
      published_at: source.published_at ?? null,
      facts: sourceFactsForPrompt(source),
    }));
}

/**
 * Fact-check a featured draft against stored source facts.
 * If unsupported claims are found, return a revised draft that keeps only source-backed statements.
 */
export async function verifyDraftAgainstSources(
  story: GeneratedStory,
  draft: GeneratedSuggestion
): Promise<VerifyResult> {
  const sources = sourcePacket(story);
  if (sources.length === 0) {
    return { supported: false, unsupported_claims: ["No verifiable sources attached."], revised: null };
  }

  const prompt = `You are a strict fact-checker for Phrenos.ai editorial drafts.

${SOURCE_INTEGRITY_BLOCK}

Compare the draft to the source facts only. Flag any claim that is not explicitly supported by the sources (numbers, dates, product names, quotes, causality, "first/only", security incidents, etc.).

Story title: ${story.title}

Sources:
${JSON.stringify(sources, null, 2)}

Draft:
${JSON.stringify(
  {
    suggestion_type: draft.suggestion_type,
    title: draft.title,
    hook: draft.hook,
    body_html: draft.body_html,
    cta: draft.cta,
    hashtags: draft.hashtags,
    image_ideas: draft.image_ideas,
  },
  null,
  2
)}

Return ONLY JSON:
{
  "supported": true|false,
  "unsupported_claims": ["claim 1", "claim 2"],
  "revised": {
    "suggestion_type": "${draft.suggestion_type}",
    "title": "...",
    "hook": "...",
    "body_html": "...",
    "cta": "...",
    "hashtags": "...",
    "image_ideas": "..."
  }
}

Rules for revised:
- Keep Phrenos voice and mandatory British English spelling
- Preserve a tension-driven title, concrete executive hook, and two-part cta (primary provocation + supporting nurture line)
- Remove or rewrite every unsupported claim
- Do not invent replacement facts
- Keep Why this matters now and What to do next for blog drafts
- No em-dash or en-dash characters
- If the draft is fully supported, set supported=true and still return the same draft in revised`;

  const text = await callAnthropicSafe(
    prompt,
    draft.suggestion_type === "blog" ? 12000 : 6000
  );
  const json = text ? extractJsonObject(text) : null;
  if (!json) {
    return { supported: true, unsupported_claims: [], revised: draft };
  }

  try {
    const parsed = JSON.parse(json) as {
      supported?: boolean;
      unsupported_claims?: unknown;
      revised?: GeneratedSuggestion;
    };

    const unsupported = Array.isArray(parsed.unsupported_claims)
      ? parsed.unsupported_claims
          .filter((item): item is string => typeof item === "string")
          .map((item) => sanitizeDashes(item).trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const revisedRaw = parsed.revised
      ? cleanSuggestionFields({
          ...parsed.revised,
          suggestion_type: draft.suggestion_type,
          is_full_draft: true,
        })
      : null;

    const revised =
      revisedRaw &&
      !hasOffVoiceMarkers(revisedRaw) &&
      !hasWeakCta(revisedRaw) &&
      !hasNewsWireTitle(revisedRaw) &&
      !isLowQualitySuggestionBody(revisedRaw.body_html) &&
      meetsLengthTarget(revisedRaw)
        ? revisedRaw
        : null;

    const supported = parsed.supported === true && unsupported.length === 0;

    return {
      supported,
      unsupported_claims: unsupported,
      revised: revised ?? (supported ? draft : null),
    };
  } catch {
    return { supported: true, unsupported_claims: [], revised: draft };
  }
}

/** Verify a draft; return the verified/revised version, or null if it cannot be saved safely. */
export async function enforceSourceVerifiedDraft(
  story: GeneratedStory,
  draft: GeneratedSuggestion
): Promise<GeneratedSuggestion | null> {
  const result = await verifyDraftAgainstSources(story, draft);
  if (result.supported && result.revised) return result.revised;
  if (result.revised) {
    console.warn(
      `Draft for "${story.title}" revised after fact-check:`,
      result.unsupported_claims.join("; ")
    );
    return result.revised;
  }
  console.warn(
    `Draft for "${story.title}" failed fact-check:`,
    result.unsupported_claims.join("; ") || "unsupported claims"
  );
  return null;
}
