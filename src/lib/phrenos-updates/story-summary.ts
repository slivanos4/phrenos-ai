import {
  bulletsToSummaryText,
  parseSummaryBullets,
  sanitizeDashes,
} from "@/lib/phrenos-updates/sanitize";
import {
  cleanSourceExcerpt,
  isCookieConsentText,
  isLowQualityExcerpt,
  isUsableProseChunk,
} from "@/lib/phrenos-updates/source-text";
import { sourceFactsForPrompt } from "@/lib/phrenos-updates/source-enrichment";
import {
  callAnthropicSafe,
  extractJsonObject,
  isAnthropicConfigured,
} from "@/lib/phrenos-updates/anthropic";
import { STORY_SUMMARY_RULES } from "@/lib/phrenos-updates/prompts";
import { SECTION_LABELS, type GeneratedStory } from "@/lib/phrenos-updates/types";

export type SummarySource = {
  excerpt: string;
  extracted_facts?: string | null;
  is_synthesis: boolean;
  title?: string;
};

function normalizeCompareText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHeadlineOnlySummary(summary: string, title: string): boolean {
  const summaryNorm = normalizeCompareText(summary);
  const titleNorm = normalizeCompareText(title);
  if (!summaryNorm) return true;
  if (summaryNorm === titleNorm) return true;

  const bulletLines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));
  if (bulletLines.length >= 2) return false;

  return summary.length < 200;
}

function filterSummaryBullets(summary: string): string[] {
  return parseSummaryBullets(summary).filter(
    (bullet) => isUsableProseChunk(bullet) && !isCookieConsentText(bullet)
  );
}

export function summaryBulletsForDisplay(summary: string): string[] {
  return filterSummaryBullets(summary);
}

export function hasSummaryBullets(summary: string): boolean {
  return filterSummaryBullets(summary).length >= 2;
}

function factLinesFromSource(source: SummarySource): string[] {
  const factsText = source.extracted_facts?.trim();
  if (!factsText) return [];

  return factsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length >= 24 && !isCookieConsentText(line) && !isLowQualityExcerpt(line));
}

function sentencesFromExcerpt(excerpt: string): string[] {
  return cleanSourceExcerpt(excerpt)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => isUsableProseChunk(sentence));
}

function toBullet(sentence: string) {
  return `- ${sentence.replace(/^[-•]\s*/, "").trim()}`;
}

/** Deterministic fallback: build bullets straight from extracted facts, then excerpts. */
export function buildSummaryFromExcerpts(title: string, sources: SummarySource[]): string {
  const bullets: string[] = [];
  const seen = new Set<string>();

  const articles = sources.filter((source) => !source.is_synthesis);

  for (const article of articles) {
    for (const fact of factLinesFromSource(article)) {
      const bullet = toBullet(fact);
      const key = normalizeCompareText(bullet);
      if (seen.has(key)) continue;
      seen.add(key);
      bullets.push(bullet);
      if (bullets.length >= 6) break;
    }
    if (bullets.length >= 6) break;
  }

  const excerptArticles = articles
    .map((source) => ({ ...source, excerpt: cleanSourceExcerpt(source.excerpt) }))
    .filter((source) => source.excerpt.length > 40 && !isLowQualityExcerpt(source.excerpt));

  if (bullets.length < 2) {
    for (const article of excerptArticles.slice(0, 4)) {
      for (const sentence of sentencesFromExcerpt(article.excerpt)) {
        const bullet = toBullet(sentence);
        const key = normalizeCompareText(bullet);
        if (seen.has(key)) continue;
        seen.add(key);
        bullets.push(bullet);
        if (bullets.length >= 6) break;
      }
      if (bullets.length >= 6) break;
    }
  }

  if (bullets.length >= 2) {
    return bullets.slice(0, 6).join("\n");
  }

  for (const article of excerptArticles) {
    const fallbackSentence = sentencesFromExcerpt(article.excerpt)[0];
    if (!fallbackSentence) continue;
    const fallback = toBullet(fallbackSentence);
    const key = normalizeCompareText(fallback);
    if (!seen.has(key)) {
      seen.add(key);
      bullets.push(fallback);
    }
  }

  return bullets.slice(0, 6).join("\n");
}

export function trimExcerpt(text: string, maxLength: number): string {
  const trimmed = cleanSourceExcerpt(text);
  if (trimmed.length <= maxLength) return trimmed;
  const slice = trimmed.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}...`;
}

export function isPlaceholderSummary(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("replace with live research") ||
    lower.includes("when api keys are configured") ||
    lower.includes("summary for admin review") ||
    lower.includes("lorem ipsum")
  );
}

/** Doc section 16 quality gates for summaries. */
export function isLowQualitySummary(text: string, title?: string): boolean {
  if (!text.trim()) return true;
  if (isPlaceholderSummary(text)) return true;
  if (title && isHeadlineOnlySummary(text, title)) return true;

  const bullets = filterSummaryBullets(text);
  if (bullets.length < 2) return true;
  if (bullets.some((bullet) => isCookieConsentText(bullet))) return true;

  const lower = text.toLowerCase();
  if (/#{1,6}\s/.test(text)) return true;
  if (lower.includes("image credit") || lower.includes("photo: shutterstock")) return true;
  if (lower.includes("may be an image of")) return true;
  if (isLowQualityExcerpt(text)) return true;
  if (/\b\w+_\w+\s*•\s*follow\b/i.test(text)) return true;
  if (text.length > 900) return true;

  return false;
}

export function polishSummary(title: string, summary: string, sources: SummarySource[]): string {
  const raw = sanitizeDashes(summary ?? "").trim();
  const cleanedBullets = filterSummaryBullets(raw);

  if (
    cleanedBullets.length >= 2 &&
    !isLowQualitySummary(bulletsToSummaryText(cleanedBullets), title)
  ) {
    return bulletsToSummaryText(cleanedBullets);
  }

  return buildSummaryFromExcerpts(title, sources);
}

export async function generateStorySummary(story: GeneratedStory): Promise<string | null> {
  if (!isAnthropicConfigured()) return null;

  const sourceSnippets = story.sources
    .filter((source) => !source.is_synthesis && (source.excerpt || source.extracted_facts))
    .slice(0, 6)
    .map((source) => ({
      title: source.title,
      facts: sourceFactsForPrompt(source).slice(0, 1200),
    }));

  const prompt = `Write one generative AI news summary for the Phrenos.ai editorial desk, for admin review.

Story title: ${story.title}
Section: ${SECTION_LABELS[story.section] ?? story.section}

Source facts (use these only, do not copy cookie banners or page chrome):
${JSON.stringify(sourceSnippets, null, 2)}

${STORY_SUMMARY_RULES}

Return ONLY JSON: {"summary_html":"..."}`;

  const text = await callAnthropicSafe(prompt, 1200);
  const jsonPayload = extractJsonObject(text);
  if (!jsonPayload) return null;

  try {
    const parsed = JSON.parse(jsonPayload) as { summary_html?: string };
    const summary = parsed.summary_html?.trim();
    if (!summary || isLowQualitySummary(summary, story.title)) return null;
    return sanitizeDashes(summary);
  } catch {
    return null;
  }
}

export async function ensurePolishedSummaries(stories: GeneratedStory[]): Promise<GeneratedStory[]> {
  return Promise.all(
    stories.map(async (story) => {
      const sources = story.sources.map((source) => ({
        excerpt: source.excerpt,
        extracted_facts: source.extracted_facts ?? null,
        is_synthesis: source.is_synthesis,
        title: source.title,
      }));

      let summary = polishSummary(story.title, story.summary_html, sources);
      if (isLowQualitySummary(summary, story.title)) {
        const generated = await generateStorySummary(story);
        if (generated) summary = generated;
      }

      if (isLowQualitySummary(summary, story.title)) {
        summary = buildSummaryFromExcerpts(story.title, sources);
      }

      return { ...story, summary_html: summary };
    })
  );
}

export function isWeakStoryTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 12) return true;
  if (/\.\.\.\s*$/.test(trimmed)) return true;
  if (/^(instagram|facebook|linkedin|x|twitter)$/i.test(trimmed)) return true;
  return false;
}

export function normalizeStoryTitle(source: {
  title: string;
  excerpt: string;
  url?: string;
}): string {
  const title = sanitizeDashes(source.title).trim();
  if (!isWeakStoryTitle(title)) return title;

  const fromExcerpt = cleanSourceExcerpt(source.excerpt)
    .split(/(?<=[.!?])\s+/)[0]
    ?.trim();
  if (fromExcerpt && fromExcerpt.length >= 20 && fromExcerpt.length <= 140) {
    return fromExcerpt.replace(/[.!?]+$/, "");
  }

  try {
    if (source.url) {
      const slug = new URL(source.url).pathname.split("/").filter(Boolean).pop() ?? "";
      const words = slug.replace(/[-_]+/g, " ").replace(/\d+/g, " ").trim();
      if (words.length >= 12) {
        return words.replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 120);
      }
    }
  } catch {
    // ignore bad URLs
  }

  return title.length > 0 ? title : "Generative AI update";
}
