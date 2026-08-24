/** House style: no em-dash or en-dash in published copy. */
import { cleanSourceExcerpt } from "@/lib/phrenos-updates/source-text";

export function sanitizeDashes(text: string): string {
  return text
    .replace(/\?\s*\u2014\s*/g, "? ")
    .replace(/"\s*\u2014\s*/g, '": ')
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/(\d)\u2013(\d)/g, "$1-$2")
    .replace(/\s*\u2013\s*/g, " to ")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** URLs keep path slugs intact: swap unicode dashes for ASCII hyphens only. */
export function sanitizeSourceUrl(url: string): string {
  return url.replace(/\u2014/g, "-").replace(/\u2013/g, "-").trim();
}

/**
 * Convert common American spellings to British English (Phrenos house style).
 * Case-preserving. Prefer high-confidence conversions only.
 */
const AMERICAN_TO_BRITISH: Array<[RegExp, string]> = [
  [/\borganizations\b/gi, "organisations"],
  [/\borganization\b/gi, "organisation"],
  [/\borganizational\b/gi, "organisational"],
  [/\bbehaviors\b/gi, "behaviours"],
  [/\bbehavioral\b/gi, "behavioural"],
  [/\bbehavior\b/gi, "behaviour"],
  [/\bfavorites\b/gi, "favourites"],
  [/\bfavorite\b/gi, "favourite"],
  [/\bfavored\b/gi, "favoured"],
  [/\bfavoring\b/gi, "favouring"],
  [/\bfavorable\b/gi, "favourable"],
  [/\bfavor\b/gi, "favour"],
  [/\bcolored\b/gi, "coloured"],
  [/\bcoloring\b/gi, "colouring"],
  [/\bcolors\b/gi, "colours"],
  [/\bcolor\b/gi, "colour"],
  [/\boptimizations\b/gi, "optimisations"],
  [/\boptimization\b/gi, "optimisation"],
  [/\boptimized\b/gi, "optimised"],
  [/\boptimizing\b/gi, "optimising"],
  [/\boptimize\b/gi, "optimise"],
  [/\banalyzed\b/gi, "analysed"],
  [/\banalyzing\b/gi, "analysing"],
  [/\banalyze\b/gi, "analyse"],
  [/\brecognized\b/gi, "recognised"],
  [/\brecognizing\b/gi, "recognising"],
  [/\brecognize\b/gi, "recognise"],
  [/\bcentered\b/gi, "centred"],
  [/\bcentering\b/gi, "centring"],
  [/\bcenters\b/gi, "centres"],
  [/\bcenter\b/gi, "centre"],
  [/\bdefenses\b/gi, "defences"],
  [/\bdefense\b/gi, "defence"],
  [/\boffenses\b/gi, "offences"],
  [/\boffense\b/gi, "offence"],
  [/\blabors\b/gi, "labours"],
  [/\blabor\b/gi, "labour"],
  [/\bhonors\b/gi, "honours"],
  [/\bhonor\b/gi, "honour"],
  [/\bcatalogs\b/gi, "catalogues"],
  [/\bcatalog\b/gi, "catalogue"],
  [/\bdialogs\b/gi, "dialogues"],
  [/\bdialog\b/gi, "dialogue"],
  [/\btraveling\b/gi, "travelling"],
  [/\btraveled\b/gi, "travelled"],
  [/\btravelers\b/gi, "travellers"],
  [/\btraveler\b/gi, "traveller"],
  [/\bcanceled\b/gi, "cancelled"],
  [/\bcanceling\b/gi, "cancelling"],
  [/\bmodeled\b/gi, "modelled"],
  [/\bmodeling\b/gi, "modelling"],
  [/\blabeled\b/gi, "labelled"],
  [/\blabeling\b/gi, "labelling"],
  [/\bfulfillment\b/gi, "fulfilment"],
  [/\bfulfills\b/gi, "fulfils"],
  [/\bfulfill\b/gi, "fulfil"],
  [/\benrollment\b/gi, "enrolment"],
  [/\bjudgments\b/gi, "judgements"],
  [/\bjudgment\b/gi, "judgement"],
  [/\bleveled\b/gi, "levelled"],
  [/\bleveling\b/gi, "levelling"],
];

function matchCase(source: string, replacement: string): string {
  if (source.length > 0 && source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (source.length > 0 && source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function toBritishEnglish(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pattern, british] of AMERICAN_TO_BRITISH) {
    out = out.replace(pattern, (matched) => matchCase(matched, british));
  }
  return out;
}

/** Editorial copy: British English + house dash rules. */
export function sanitizeEditorialText(text: string): string {
  return toBritishEnglish(sanitizeDashes(text));
}

export function sanitizeSourceFields<
  T extends { url: string; title: string; excerpt: string; published_at?: string | null },
>(source: T): T {
  return {
    ...source,
    url: sanitizeSourceUrl(source.url),
    title: sanitizeDashes(source.title),
    excerpt: cleanSourceExcerpt(sanitizeDashes(source.excerpt)),
    published_at:
      source.published_at?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? source.published_at ?? null,
  };
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizePlainText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) =>
      sanitizeEditorialText(paragraph.replace(/\n/g, " ").trim())
    )
    .filter(Boolean)
    .join("\n\n");
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Parse summary content into bullet strings (no leading dash). */
export function parseSummaryBullets(value: string): string[] {
  if (!value?.trim()) return [];

  if (/<ul[\s>]/i.test(value)) {
    const fromList = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) =>
        sanitizeEditorialText(stripHtmlToText(match[1]).replace(/\s+/g, " ").trim())
      )
      .filter(Boolean);
    if (fromList.length > 0) return fromList;
  }

  const text = /<[a-z][\s\S]*>/i.test(value) ? stripHtmlToText(value) : value;
  const bullets: string[] = [];

  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^[-•]\s+/.test(line)) {
      bullets.push(sanitizeEditorialText(line.replace(/^[-•]\s+/, "").trim()));
      continue;
    }

    bullets.push(sanitizeEditorialText(line.replace(/^[-•]\s*/, "").trim()));
  }

  return bullets.filter(Boolean);
}

/** Store summaries as one markdown-style bullet per line. */
export function bulletsToSummaryText(bullets: string[]): string {
  return bullets
    .map((bullet) => sanitizeEditorialText(bullet.replace(/^[-•]\s*/, "").trim()))
    .filter(Boolean)
    .map((bullet) => `- ${bullet}`)
    .join("\n");
}

export function sanitizeSummaryText(text: string): string {
  return bulletsToSummaryText(parseSummaryBullets(text));
}

export function summaryToPlainText(value: string): string {
  if (!value) return "";
  return sanitizeSummaryText(value);
}

/** Wrap plain-text summaries for published HTML fields. */
export function plainTextToSummaryHtml(value: string): string {
  const bullets = parseSummaryBullets(value);
  if (bullets.length === 0) return "";
  if (bullets.length >= 2) {
    return `<ul>${bullets.map((bullet) => `<li>${escapeHtmlText(bullet)}</li>`).join("")}</ul>`;
  }
  return `<p>${escapeHtmlText(bullets[0])}</p>`;
}

/** Strip line-break hacks and normalise block HTML for on-screen preview. */
export function normalizePresentationHtml(html: string): string {
  if (!html) return "";

  let out = sanitizeEditorialText(
    html
      .replace(/<br\s*\/?>/gi, "")
      .replace(/<\/p>\s*<p>/gi, "</p><p>")
      .replace(/(<\/h[23]>)\s*(<p>)/gi, "$1$2")
      .trim()
  );

  if (out && !/^<(p|h[1-6]|ul|ol|blockquote)/i.test(out)) {
    out = `<p>${out}</p>`;
  }

  return out;
}

export function countWords(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

export function slugify(value: string): string {
  return sanitizeDashes(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
