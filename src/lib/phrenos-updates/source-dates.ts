export type SourceLookback = {
  lookbackStart: string;
  lookbackEnd: string;
};

/** All research sources must fall within this many days of the run date. */
export const LOOKBACK_DAYS = 14;
export const MAX_SOURCE_AGE_DAYS = LOOKBACK_DAYS;

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizePublishedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Avoid Date.parse on bare "January 2026" / ambiguous strings; require a day.
  const dmy = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/);
  if (dmy) return toIsoDate(dmy[3], dmy[2], dmy[1]);

  const mdy = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})$/);
  if (mdy) return toIsoDate(mdy[3], mdy[1], mdy[2]);

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject timezone-shifted nonsense for date-only intent when input lacked a day.
  if (!/\d{1,2}/.test(trimmed)) return null;
  return parsed.toISOString().slice(0, 10);
}

function monthNumber(name: string): string | null {
  return MONTHS[name.toLowerCase()] ?? null;
}

function toIsoDate(year: string, month: string, day: string): string | null {
  const monthNum = /^\d{2}$/.test(month) ? month : monthNumber(month);
  if (!monthNum) return null;
  const dayNum = day.padStart(2, "0");
  const candidate = `${year}-${monthNum}-${dayNum}`;
  return parseIsoDate(candidate) ? candidate : null;
}

function firstDatedMatch(
  text: string,
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[1] && match[2] && match[3] && /^\d{4}$/.test(match[1])) {
      // ISO groups year-month-day
      const candidate = `${match[1]}-${match[2]}-${match[3]}`;
      if (parseIsoDate(candidate)) return candidate;
    }

    if (match[1] && match[2] && match[3] && /[A-Za-z]/.test(match[2])) {
      const resolved = toIsoDate(match[3], match[2], match[1]);
      if (resolved) return resolved;
    }

    if (match[1] && match[2] && match[3] && /[A-Za-z]/.test(match[1])) {
      const resolved = toIsoDate(match[3], match[1], match[2]);
      if (resolved) return resolved;
    }

    if (match[1]) {
      const normalized = normalizePublishedDate(match[1]);
      if (normalized) return normalized;
    }
  }
  return null;
}

/** Prefer explicit publish cues so we do not latch onto unrelated page dates. */
export function extractPublishedDateFromText(text: string): string | null {
  if (!text) return null;

  const cuePatterns = [
    /(?:published|posted|publication\s*date|pub(?:lication)?\s*date|date\s*published)\s*[:\-]?\s*((?:20\d{2})-\d{2}-\d{2})/i,
    /(?:published|posted|publication\s*date|pub(?:lication)?\s*date|date\s*published)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i,
    /(?:published|posted|publication\s*date|pub(?:lication)?\s*date|date\s*published)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/i,
  ];

  const fromCue = firstDatedMatch(text, cuePatterns);
  if (fromCue) return fromCue;

  // Only scan the opening slice for bare dates; footers often contain older years.
  const head = text.slice(0, 2500);

  const iso = head.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = head.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/);
  if (dmy) {
    const resolved = toIsoDate(dmy[3], dmy[2], dmy[1]);
    if (resolved) return resolved;
  }

  const mdy = head.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (mdy) {
    const resolved = toIsoDate(mdy[3], mdy[1], mdy[2]);
    if (resolved) return resolved;
  }

  return null;
}

export function extractPublishedDateFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.search;

    const slashMatch = path.match(/\/(20\d{2})[/-](\d{2})[/-](\d{2})/);
    if (slashMatch) {
      return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
    }

    const segmentMatch = path.match(/\/(20\d{2})\/(\d{2})\/(\d{2})(?:\/|$)/);
    if (segmentMatch) {
      return `${segmentMatch[1]}-${segmentMatch[2]}-${segmentMatch[3]}`;
    }

    const embeddedMatch = path.match(/-(20\d{2}-\d{2}-\d{2})(?:-|$)/);
    if (embeddedMatch) {
      return embeddedMatch[1];
    }

    const compactMatch = path.match(/\/(20\d{2})(\d{2})(\d{2})\//);
    if (compactMatch) {
      return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    }

    const queryDate =
      search.match(/[?&]date=(20\d{2}-\d{2}-\d{2})/i)?.[1] ??
      search.match(/[?&]published=(20\d{2}-\d{2}-\d{2})/i)?.[1];
    if (queryDate) return queryDate;

    const slugDate = path.match(/\/(\d{1,2})-([a-z]+)-?(20\d{2})/i);
    if (slugDate) {
      const resolved = toIsoDate(slugDate[3], slugDate[2], slugDate[1]);
      if (resolved) return resolved;
    }
  } catch {
    return null;
  }
  return null;
}

const PRIMARY_HTML_DATE_PATTERNS = [
  /property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i,
  /property=["']og:published_time["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*property=["']og:published_time["']/i,
  /name=["']pubdate["'][^>]*content=["']([^"']+)["']/i,
  /name=["']publish(?:ed)?[_-]?date["'][^>]*content=["']([^"']+)["']/i,
  /itemprop=["']datePublished["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*itemprop=["']datePublished["']/i,
  /"datePublished"\s*:\s*"([^"]+)"/i,
  /<time[^>]+datetime=["']([^"']+)["'][^>]*(?:itemprop=["']datePublished["']|class=["'][^"']*publish)/i,
];

const FALLBACK_HTML_DATE_PATTERNS = [
  /name=["']date["'][^>]*content=["']([^"']+)["']/i,
  /<time[^>]+datetime=["']([^"']+)["']/i,
  /"dateModified"\s*:\s*"([^"]+)"/i,
];

export function extractPublishedDateFromHtml(html: string): string | null {
  for (const pattern of PRIMARY_HTML_DATE_PATTERNS) {
    const match = html.match(pattern);
    const normalized = normalizePublishedDate(match?.[1]);
    if (normalized) return normalized;
  }

  const fromCues = extractPublishedDateFromText(html.slice(0, 12_000));
  if (fromCues) return fromCues;

  for (const pattern of FALLBACK_HTML_DATE_PATTERNS) {
    const match = html.match(pattern);
    const normalized = normalizePublishedDate(match?.[1]);
    if (normalized) return normalized;
  }

  return null;
}

/**
 * Resolve a publish date from API metadata, URL, and text hints.
 * When lookback is provided, prefer candidates inside the window and never
 * return an out-of-window date (those articles must be filtered out instead).
 */
export function resolveSourcePublishedDate(
  url: string,
  publishedDateFromApi?: string | null,
  existing?: string | null,
  textHints?: string | null,
  lookback?: SourceLookback | null
): string | null {
  const candidates = [
    normalizePublishedDate(publishedDateFromApi),
    extractPublishedDateFromUrl(url),
    textHints ? extractPublishedDateFromText(textHints) : null,
    normalizePublishedDate(existing),
  ].filter((value): value is string => Boolean(value));

  if (candidates.length === 0) return null;

  if (!lookback) return candidates[0];

  const inWindow = candidates.find((date) => isPublishedWithinLookback(date, lookback));
  return inWindow ?? null;
}

/** Strict: publish date must fall inside lookbackStart..lookbackEnd (inclusive). */
export function isPublishedWithinLookback(
  publishedAt: string | null,
  lookback: SourceLookback
): boolean {
  if (!publishedAt) return false;
  const published = parseIsoDate(publishedAt);
  const start = parseIsoDate(lookback.lookbackStart);
  const end = parseIsoDate(lookback.lookbackEnd);
  if (!published || !start || !end) return false;
  return published >= start && published <= end;
}

export function isPublishedInPreferredWindow(
  publishedAt: string | null,
  lookback: SourceLookback
): boolean {
  return isPublishedWithinLookback(publishedAt, lookback);
}

export function formatSourcePublishedDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Date unknown";
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

export function getDisplayPublishedDate(source: {
  url: string;
  published_at?: string | null;
  is_synthesis: boolean;
  title?: string | null;
  snapshot_excerpt?: string | null;
}): string | null {
  if (source.is_synthesis || !source.url) return null;
  return resolveSourcePublishedDate(
    source.url,
    null,
    source.published_at,
    `${source.title ?? ""} ${source.snapshot_excerpt ?? ""}`
  );
}

export function comparePublishedDesc(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.localeCompare(left);
}
