export type SourceLookback = {
  lookbackStart: string;
  lookbackEnd: string;
};

export const MAX_SOURCE_AGE_DAYS = 14;

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

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
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

export function extractPublishedDateFromText(text: string): string | null {
  if (!text) return null;

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = text.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})\b/);
  if (dmy) {
    const resolved = toIsoDate(dmy[3], dmy[2], dmy[1]);
    if (resolved) return resolved;
  }

  const mdy = text.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (mdy) {
    const resolved = toIsoDate(mdy[3], mdy[1], mdy[2]);
    if (resolved) return resolved;
  }

  const slashUk = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slashUk) {
    const resolved = toIsoDate(slashUk[3], slashUk[2], slashUk[1]);
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

const HTML_DATE_PATTERNS = [
  /property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i,
  /property=["']og:published_time["'][^>]*content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]*property=["']og:published_time["']/i,
  /name=["']pubdate["'][^>]*content=["']([^"']+)["']/i,
  /name=["']date["'][^>]*content=["']([^"']+)["']/i,
  /<time[^>]+datetime=["']([^"']+)["']/i,
  /"datePublished"\s*:\s*"([^"]+)"/i,
  /"dateModified"\s*:\s*"([^"]+)"/i,
];

export function extractPublishedDateFromHtml(html: string): string | null {
  for (const pattern of HTML_DATE_PATTERNS) {
    const match = html.match(pattern);
    const normalized = normalizePublishedDate(match?.[1]);
    if (normalized) return normalized;
  }
  return extractPublishedDateFromText(html.slice(0, 8000));
}

export function resolveSourcePublishedDate(
  url: string,
  publishedDateFromApi?: string | null,
  existing?: string | null,
  textHints?: string | null
): string | null {
  return (
    normalizePublishedDate(publishedDateFromApi) ??
    extractPublishedDateFromUrl(url) ??
    (textHints ? extractPublishedDateFromText(textHints) : null) ??
    normalizePublishedDate(existing)
  );
}

export function isPublishedWithinLookback(
  publishedAt: string | null,
  lookback: SourceLookback
): boolean {
  if (!publishedAt) return false;
  const published = parseIsoDate(publishedAt);
  const end = parseIsoDate(lookback.lookbackEnd);
  if (!published || !end) return false;

  const earliest = new Date(end);
  earliest.setUTCDate(earliest.getUTCDate() - MAX_SOURCE_AGE_DAYS);

  return published >= earliest && published <= end;
}

export function isPublishedInPreferredWindow(
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
