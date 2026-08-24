import { countWords, sanitizeEditorialText } from "@/lib/phrenos-updates/sanitize";
import { isLowQualityExcerpt } from "@/lib/phrenos-updates/source-text";
import type { GeneratedSuggestion } from "@/lib/phrenos-updates/types";

/** Word targets from the pipeline doc, section 3. */
export const BLOG_MIN_WORDS = 1200;
export const BLOG_TARGET_WORDS = 1500;
export const BLOG_MAX_WORDS = 1700;
export const LINKEDIN_MIN_WORDS = 220;
export const LINKEDIN_TARGET_WORDS = 360;
export const LINKEDIN_MAX_WORDS = 450;
export const IDEA_MIN_WORDS = 20;

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLowQualitySuggestionBody(bodyHtml: string): boolean {
  const text = stripHtml(bodyHtml);
  if (!text || text.length < 40) return true;
  return isLowQualityExcerpt(text);
}

/**
 * Quality gate from doc section 16: reject copy that drifts into the reference
 * project's persona or into internal team framing instead of global reader framing.
 */
const OFF_VOICE_MARKERS = [
  "spyros",
  "hospitality nerd",
  "the rota is wrong",
  "well... maybe",
  "but also, maybe not at all",
  "pre-service brief",
  "what this means for us",
  "for our team",
  "our vertical",
  "our travel team",
  "revpar",
  "day-part",
  "upsell attach",
  "#hospitalitynerd",
  "#ukhospitality",
];

export function offVoiceMarkers(suggestion: GeneratedSuggestion): string[] {
  const haystack = `${suggestion.title} ${suggestion.hook} ${suggestion.body_html} ${suggestion.cta} ${suggestion.hashtags}`.toLowerCase();
  return OFF_VOICE_MARKERS.filter((marker) => haystack.includes(marker));
}

export function hasOffVoiceMarkers(suggestion: GeneratedSuggestion): boolean {
  return offVoiceMarkers(suggestion).length > 0;
}

/** Featured drafts must carry the conversion beats from doc section 2. */
export function hasConversionBeats(suggestion: GeneratedSuggestion): boolean {
  const haystack = `${suggestion.body_html} ${suggestion.cta}`.toLowerCase();
  return haystack.includes("why this matters now") && haystack.includes("what to do next");
}

const WEAK_CTA_MARKERS = [
  "start a conversation",
  "get in touch",
  "contact us",
  "learn more",
  "book a call",
  "reach out",
  "schedule a call",
];

/** Reject soft contact CTAs; article CTAs must sell the next outcome. */
export function hasWeakCta(suggestion: GeneratedSuggestion): boolean {
  const cta = (suggestion.cta ?? "").toLowerCase().trim();
  if (!cta) return true;
  return WEAK_CTA_MARKERS.some((marker) => cta.includes(marker));
}

/** Prefer titles that carry tension, not a pure news announcement. */
export function hasNewsWireTitle(suggestion: GeneratedSuggestion): boolean {
  const title = (suggestion.title ?? "").trim();
  if (!title) return true;
  if (/[?.!]/.test(title)) return false;
  return /^(company|openai|google|microsoft|amazon|meta|anthropic|nvidia|binance)\b/i.test(
    title
  ) && /\b(launches?|announces?|unveils?|releases?|introduces?)\b/i.test(title);
}

export function meetsLengthTarget(suggestion: GeneratedSuggestion): boolean {
  const words = countWords(suggestion.body_html);
  if (suggestion.suggestion_type === "blog") return words >= BLOG_MIN_WORDS;
  if (suggestion.suggestion_type === "linkedin") return words >= LINKEDIN_MIN_WORDS;
  return false;
}

export function isTooShortSuggestion(suggestion: GeneratedSuggestion): boolean {
  return !meetsLengthTarget(suggestion);
}

/** Full drafts must pass length, voice, and traceable-conversion gates. */
export function isPublishableFullDraft(suggestion: GeneratedSuggestion): boolean {
  if (isLowQualitySuggestionBody(suggestion.body_html)) return false;
  if (hasOffVoiceMarkers(suggestion)) return false;
  if (hasWeakCta(suggestion)) return false;
  if (hasNewsWireTitle(suggestion)) return false;
  return meetsLengthTarget(suggestion);
}

function normalizeCta(value: string): string {
  const cleaned = sanitizeEditorialText(value ?? "").trim();
  if (!cleaned) return "";
  const parts = cleaned
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return cleaned;
  return parts.slice(0, 2).join("\n\n");
}

/** Preserve LLM HTML structure; enforce British English and house dash rules. */
export function cleanSuggestionFields(suggestion: GeneratedSuggestion): GeneratedSuggestion | null {
  const plain = stripHtml(suggestion.body_html);
  if (!plain || plain.length < 40) return null;
  if (isLowQualityExcerpt(plain)) return null;

  return {
    ...suggestion,
    title: sanitizeEditorialText(suggestion.title ?? "").trim(),
    hook: sanitizeEditorialText(suggestion.hook ?? "").trim(),
    body_html: sanitizeEditorialText(suggestion.body_html).trim(),
    cta: normalizeCta(suggestion.cta ?? ""),
    hashtags: sanitizeEditorialText(suggestion.hashtags ?? "").trim(),
    image_ideas: sanitizeEditorialText(suggestion.image_ideas ?? "").trim(),
  };
}

export function suggestionBodyKey(bodyHtml: string): string {
  return stripHtml(bodyHtml).slice(0, 360);
}
