const COOKIE_CONSENT_PATTERN =
  /\b(?:cookies?|cookie settings|reject all|accept all|customi[sz]e|essential cookies|optimi[sz]e site functionality|best possible experience|privacy preference)\b/i;

export function isCookieConsentText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  if (!lower.includes("cookie") && !lower.includes("customise") && !lower.includes("customize")) {
    return false;
  }
  return (
    COOKIE_CONSENT_PATTERN.test(lower) ||
    lower.includes("clicking reject all") ||
    lower.includes("we use cookies") ||
    lower.includes("to control which cookies")
  );
}

const PHOTO_CREDIT_PATTERN =
  /\b(?:photo|image)\s*(?:credit)?\s*:?\s*(?:shutterstock|getty|istock|alamy|unsplash)\b/gi;
const MARKDOWN_HEADING_PATTERN = /(?:^|\s)#{1,6}\s+/gm;
const SOCIAL_HANDLE_PATTERN = /\b[\w.]+\s*•\s*Follow\b/gi;
const VIDEO_BY_LINE_PATTERN = /\bVideo by [^.!?]+[.!?]/gi;
const PHOTO_BY_LINE_PATTERN = /\bPhoto by [^.!?]+[.!?]/gi;
const ALT_TEXT_LINE_PATTERN =
  /\bMay be (?:a|an) (?:Twitter screenshot|image|video|Facebook screenshot)[^.!?]*[.!?]/gi;
const SCREENSHOT_JUNK_PATTERN = /\b(?:screenshot of screen|magazine and text)\b[^.!?]*[.!?]?/gi;

/** Publisher page furniture that Firecrawl and Tavily commonly leak into excerpts. */
const PAGE_CHROME_PATTERNS: RegExp[] = [
  /\bSign up (?:for|to) (?:our|the) newsletter\b[^.!?]*[.!?]?/gi,
  /\bSubscribe (?:to|for) (?:our|the) [^.!?]{0,60}newsletter\b[^.!?]*[.!?]?/gi,
  /\bEnter your email\b[^.!?]*[.!?]?/gi,
  /\bBy signing up[, ]you agree\b[^.!?]*[.!?]?/gi,
  /\bShare this (?:article|story|post)\b[^.!?]*[.!?]?/gi,
  /\bFollow us on [A-Za-z]+\b[^.!?]*[.!?]?/gi,
  /\bRead (?:more|next)\s*:\s*[^.!?\n]+[.!?]?/gi,
  /\bAdvertisement\b/gi,
  /\bSponsored content\b/gi,
  /\bAll rights reserved\b[^.!?]*[.!?]?/gi,
  /\bTerms of (?:Use|Service)\b[^.!?]*[.!?]?/gi,
  /\bImage:\s*[A-Z][^.!?\n]{0,60}/g,
  /\bTable of contents\b/gi,
  /\b\d+\s*min read\b/gi,
];

const SOCIAL_MEDIA_HOSTS = new Set([
  "instagram.com",
  "facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "threads.net",
  "pinterest.com",
  "linkedin.com",
  "reddit.com",
]);

export function isSocialMediaUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./i, "").toLowerCase();
    return SOCIAL_MEDIA_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Signals that a chunk is genuinely about Gen AI, used to keep fragments that
 * carry real facts but lack terminal punctuation.
 */
const GENAI_SIGNAL_PATTERN =
  /\b(?:ai|a\.i\.|artificial intelligence|machine learning|generative|gen ai|llm|model|models|multimodal|reasoning|agentic|agent|benchmark|open source|open weights|inference|training|token|context window|dataset|fine[- ]tun\w+|api|gpu|compute|chip|datacent(?:re|er)|regulation|regulator|eu ai act|copyright|safety|alignment|hallucinat\w+|enterprise|deployment|adoption|openai|anthropic|claude|gemini|google deepmind|deepmind|meta|llama|mistral|microsoft|nvidia|hugging face|copilot|chatgpt|gpt|sora|midjourney|perplexity)\b/i;

function hasConcatenatedTokens(text: string): boolean {
  // Scrape junk like openingsSources / NewsAI, not normal words such as WhatsApp or ChatGPT.
  if (/[a-z]{5,}[A-Z][a-z]{4,}/.test(text)) return true;
  return (text.match(/[a-z][A-Z]/g)?.length ?? 0) >= 4;
}

function hasExcessiveShoutyWords(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  const shouty = words.filter(
    (word) => word.length > 3 && word === word.toUpperCase() && /[A-Z]/.test(word)
  );
  return shouty.length >= 3 && shouty.length / words.length > 0.25;
}

function isProseFragment(text: string): boolean {
  const trimmed = text.trim();
  if (/^[a-z]/.test(trimmed) && trimmed.length < 60) return true;
  // Mid-sentence scrape fragments like "s model release notes".
  if (/^[a-z]{1,2}\s+[a-z]/.test(trimmed)) return true;
  if (/\bvs\.\s*$/.test(trimmed)) return true;
  if (/\bthe\s*$/i.test(trimmed)) return true;
  if (/\bto\s+\d+\s*$/i.test(trimmed)) return true;
  return false;
}

export function isScrapeJunkText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (hasConcatenatedTokens(trimmed)) return true;
  if (hasExcessiveShoutyWords(trimmed)) return true;
  if (isProseFragment(trimmed)) return true;
  if (/\bAdvertisement\b/i.test(trimmed) && trimmed.length < 120) return true;
  if (/\bSponsored (?:content|by)\b/i.test(trimmed)) return true;
  if (/\bsign up (?:for|to) (?:our|the) newsletter\b/i.test(trimmed)) return true;
  if (/\benter your email\b/i.test(trimmed)) return true;
  if (/\bshare this (?:article|story|post)\b/i.test(trimmed)) return true;
  if (/\ball rights reserved\b/i.test(trimmed)) return true;
  if (/\bfollow us on\b/i.test(trimmed)) return true;
  if (/\b\d+\s*min read\b/i.test(trimmed) && trimmed.length < 80) return true;
  if (/\bSources:\s*\w/i.test(trimmed)) return true;
  if (/\.\.\.\]/.test(trimmed)) return true;

  return false;
}

export function isUsableProseChunk(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 32) return false;
  if (isScrapeJunkText(trimmed)) return false;
  if (isLowQualityExcerpt(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 6) return false;

  const hasGenAiSignal = GENAI_SIGNAL_PATTERN.test(trimmed);
  const endsProperly = /[.!?]$/.test(trimmed);
  const startsProperly = /^[A-Z0-9"'(]/.test(trimmed);

  if (!startsProperly) return false;
  if (!endsProperly && !hasGenAiSignal) return false;

  return true;
}

export function isLowQualityExcerpt(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (lower.includes("may be an image of")) return true;
  if (lower.includes("may be a twitter screenshot")) return true;
  if (lower.includes("may be a facebook screenshot")) return true;
  if (lower.includes("screenshot of screen")) return true;
  if (/\bvideo by\b/i.test(trimmed) && /\bphoto by\b/i.test(trimmed)) return true;
  if (/\bvideo by .+\bon\b/i.test(trimmed)) return true;
  if (/\bphoto by .+\bon\b/i.test(trimmed)) return true;
  if (/#{1,6}\s/.test(trimmed)) return true;
  if (/\bjavascript is (?:disabled|required)\b/i.test(trimmed)) return true;
  if (/\benable javascript\b/i.test(trimmed)) return true;
  if (/\bpage not found\b/i.test(trimmed)) return true;
  if (/\bsubscribe to (?:read|continue)\b/i.test(trimmed)) return true;
  if (isScrapeJunkText(trimmed)) return true;
  if (isCookieConsentText(trimmed)) return true;

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  const nonLatin = trimmed.replace(/[\u0000-\u024F\s\d.,!?;:'"()\-/]/g, "");
  if (letters.length > 0 && nonLatin.length / letters.length > 0.2) return true;

  return false;
}

function stripPageChrome(text: string): string {
  let cleaned = text;
  for (const pattern of PAGE_CHROME_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned;
}

function stripAccessibilityNoise(text: string): string {
  return stripPageChrome(
    text
      .replace(MARKDOWN_HEADING_PATTERN, "")
      .replace(PHOTO_CREDIT_PATTERN, "")
      .replace(VIDEO_BY_LINE_PATTERN, "")
      .replace(PHOTO_BY_LINE_PATTERN, "")
      .replace(ALT_TEXT_LINE_PATTERN, "")
      .replace(SCREENSHOT_JUNK_PATTERN, "")
      .replace(/\bImage Credit[^.\n]*/gi, "")
      .replace(SOCIAL_HANDLE_PATTERN, "")
      .replace(/\bthat says '[^']*'/gi, "")
      .replace(/[\u1000-\uFFFF]+/g, " ")
  );
}

function splitProseSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function keepUsefulSentences(sentences: string[]): string[] {
  return sentences.filter((sentence) => {
    if (!isUsableProseChunk(sentence)) return false;
    if (/^video by /i.test(sentence)) return false;
    if (/^photo by /i.test(sentence)) return false;
    if (/^may be /i.test(sentence)) return false;
    if (/^#{1,6}\s/.test(sentence)) return false;
    if (isCookieConsentText(sentence)) return false;
    return true;
  });
}

export function cleanSourceExcerpt(text: string): string {
  if (!text) return "";

  const normalized = stripAccessibilityNoise(text).replace(/\s+/g, " ").trim();
  const sentences = keepUsefulSentences(splitProseSentences(normalized));
  const cleaned = sentences.join(" ").trim();
  if (cleaned && !isLowQualityExcerpt(cleaned)) return cleaned;

  const fallback = keepUsefulSentences(
    splitProseSentences(text.replace(/\s+/g, " ").trim())
  ).slice(0, 4);
  return fallback.join(" ").trim();
}

export function isUsableSourceExcerpt(text: string): boolean {
  const cleaned = cleanSourceExcerpt(text);
  return cleaned.length > 40 && !isLowQualityExcerpt(cleaned);
}
