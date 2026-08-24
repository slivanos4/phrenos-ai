import { callAnthropicSafe, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { BRITISH_ENGLISH_BLOCK, SOURCE_INTEGRITY_BLOCK } from "@/lib/phrenos-updates/prompts";
import { sanitizeEditorialText, sanitizeSourceUrl } from "@/lib/phrenos-updates/sanitize";
import { LOOKBACK_DAYS } from "@/lib/phrenos-updates/source-dates";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { BRIEFS_TABLE } from "@/lib/phrenos-updates/tables";

export type BriefStatus = "received" | "verified" | "needs_review" | "rejected";

export type BriefIdea = {
  suggestion_type: "blog" | "linkedin";
  title: string;
  hook: string;
  body: string;
  source_urls: string[];
};

export type WeeklyBrief = {
  id: string;
  title: string;
  lookback_start: string | null;
  lookback_end: string | null;
  research_markdown: string;
  content_markdown: string;
  ideas: BriefIdea[];
  source_urls: string[];
  status: BriefStatus;
  verification_notes: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IngestBriefInput = {
  title?: string;
  lookback_start?: string | null;
  lookback_end?: string | null;
  research_markdown?: string;
  content_markdown?: string;
  ideas?: unknown;
  source_urls?: unknown;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultLookback() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function uniqueUrls(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const url = sanitizeSourceUrl(value);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out.slice(0, 40);
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]>"']+/gi) ?? [];
  return uniqueUrls(matches.map((item) => item.replace(/[.,;:]+$/, "")));
}

function normalizeIdea(raw: unknown): BriefIdea | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const title = sanitizeEditorialText(String(row.title ?? "")).trim();
  if (!title) return null;
  const typeRaw = String(row.suggestion_type ?? row.type ?? "linkedin").toLowerCase();
  const suggestion_type = typeRaw.includes("blog") ? "blog" : "linkedin";
  const source_urls = uniqueUrls([
    ...(Array.isArray(row.source_urls)
      ? row.source_urls.filter((item): item is string => typeof item === "string")
      : []),
    ...extractUrlsFromText(String(row.body ?? row.body_html ?? "")),
  ]);

  return {
    suggestion_type,
    title,
    hook: sanitizeEditorialText(String(row.hook ?? "")).trim(),
    body: sanitizeEditorialText(String(row.body ?? row.body_html ?? "")).trim(),
    source_urls,
  };
}

function normalizeIdeas(raw: unknown): BriefIdea[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeIdea)
    .filter((item): item is BriefIdea => Boolean(item))
    .slice(0, 12);
}

function mapBriefRow(row: Record<string, unknown>): WeeklyBrief {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    lookback_start: (row.lookback_start as string | null) ?? null,
    lookback_end: (row.lookback_end as string | null) ?? null,
    research_markdown: String(row.research_markdown ?? ""),
    content_markdown: String(row.content_markdown ?? ""),
    ideas: normalizeIdeas(row.ideas),
    source_urls: Array.isArray(row.source_urls)
      ? uniqueUrls(row.source_urls.filter((item): item is string => typeof item === "string"))
      : [],
    status: (row.status as BriefStatus) ?? "received",
    verification_notes: String(row.verification_notes ?? ""),
    verified_at: (row.verified_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

async function structureBriefWithClaude(input: {
  title: string;
  research_markdown: string;
  content_markdown: string;
  lookback_start: string;
  lookback_end: string;
}): Promise<{ ideas: BriefIdea[]; source_urls: string[]; notes: string }> {
  const prompt = `You structure a Phrenos.ai weekly desk brief for the research pipeline.

${SOURCE_INTEGRITY_BLOCK}
${BRITISH_ENGLISH_BLOCK}

Period: ${input.lookback_start} to ${input.lookback_end}
Title: ${input.title}

Research markdown:
${input.research_markdown.slice(0, 12000)}

Content markdown:
${input.content_markdown.slice(0, 12000)}

Return ONLY JSON:
{
  "ideas": [
    {
      "suggestion_type": "blog"|"linkedin",
      "title": "...",
      "hook": "...",
      "body": "short angle summary",
      "source_urls": ["https://..."]
    }
  ],
  "source_urls": ["https://..."],
  "notes": "short verification note"
}

Rules:
- Extract up to 8 distinct angles from the brief
- Prefer British English
- Keep only source URLs explicitly present in the markdown
- Do not invent statistics, dates, or URLs
- If a claim looks unsupported, omit it from ideas rather than guessing
- notes should flag weak or unsupported sections briefly`;

  const text = await callAnthropicSafe(prompt, 5000);
  const json = text ? extractJsonObject(text) : null;
  if (!json) {
    return {
      ideas: [],
      source_urls: extractUrlsFromText(
        `${input.research_markdown}\n${input.content_markdown}`
      ),
      notes: "Structured parse unavailable; kept raw URLs only.",
    };
  }

  try {
    const parsed = JSON.parse(json) as {
      ideas?: unknown;
      source_urls?: unknown;
      notes?: unknown;
    };
    const ideas = normalizeIdeas(parsed.ideas);
    const source_urls = uniqueUrls([
      ...(Array.isArray(parsed.source_urls)
        ? parsed.source_urls.filter((item): item is string => typeof item === "string")
        : []),
      ...extractUrlsFromText(`${input.research_markdown}\n${input.content_markdown}`),
      ...ideas.flatMap((idea) => idea.source_urls),
    ]);
    return {
      ideas,
      source_urls,
      notes: sanitizeEditorialText(String(parsed.notes ?? "")).trim(),
    };
  } catch {
    return {
      ideas: [],
      source_urls: extractUrlsFromText(
        `${input.research_markdown}\n${input.content_markdown}`
      ),
      notes: "Structured parse failed; kept raw URLs only.",
    };
  }
}

export async function ingestWeeklyBrief(
  input: IngestBriefInput
): Promise<WeeklyBrief> {
  const defaults = defaultLookback();
  const lookback_start = (input.lookback_start || defaults.start).slice(0, 10);
  const lookback_end = (input.lookback_end || defaults.end).slice(0, 10);
  const title = sanitizeEditorialText(
    input.title?.trim() || `Desk brief ${lookback_end}`
  );
  const research_markdown = String(input.research_markdown ?? "");
  const content_markdown = String(input.content_markdown ?? "");

  let ideas = normalizeIdeas(input.ideas);
  let source_urls = uniqueUrls([
    ...(Array.isArray(input.source_urls)
      ? input.source_urls.filter((item): item is string => typeof item === "string")
      : []),
    ...extractUrlsFromText(`${research_markdown}\n${content_markdown}`),
    ...ideas.flatMap((idea) => idea.source_urls),
  ]);

  let verification_notes = "";
  let status: BriefStatus = "received";

  if (ideas.length === 0 && (research_markdown.trim() || content_markdown.trim())) {
    const structured = await structureBriefWithClaude({
      title,
      research_markdown,
      content_markdown,
      lookback_start,
      lookback_end,
    });
    ideas = structured.ideas;
    source_urls = uniqueUrls([...source_urls, ...structured.source_urls]);
    verification_notes = structured.notes;
  }

  if (ideas.length > 0) {
    status = source_urls.length > 0 ? "verified" : "needs_review";
    if (!verification_notes) {
      verification_notes =
        status === "verified"
          ? `Accepted ${ideas.length} angles with ${source_urls.length} source URLs.`
          : `Accepted ${ideas.length} angles but no source URLs were found. Review before relying on claims.`;
    }
  } else if (research_markdown.trim() || content_markdown.trim()) {
    status = "needs_review";
    verification_notes =
      verification_notes ||
      "Brief received but no extractable ideas yet. Review manually.";
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(BRIEFS_TABLE)
    .insert({
      title,
      lookback_start,
      lookback_end,
      research_markdown,
      content_markdown,
      ideas,
      source_urls,
      status,
      verification_notes,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save weekly brief.");
  }

  return mapBriefRow(data as Record<string, unknown>);
}

export async function listWeeklyBriefs(limit = 12): Promise<WeeklyBrief[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(BRIEFS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBriefRow(row as Record<string, unknown>));
}

export async function getWeeklyBrief(id: string): Promise<WeeklyBrief | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(BRIEFS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapBriefRow(data as Record<string, unknown>) : null;
}

export async function verifyWeeklyBrief(id: string): Promise<WeeklyBrief> {
  const existing = await getWeeklyBrief(id);
  if (!existing) throw new Error("Brief not found.");

  const lookback_start =
    existing.lookback_start ?? defaultLookback().start;
  const lookback_end = existing.lookback_end ?? defaultLookback().end;

  const structured = await structureBriefWithClaude({
    title: existing.title,
    research_markdown: existing.research_markdown,
    content_markdown: existing.content_markdown,
    lookback_start,
    lookback_end,
  });

  const ideas =
    structured.ideas.length > 0 ? structured.ideas : existing.ideas;
  const source_urls = uniqueUrls([
    ...existing.source_urls,
    ...structured.source_urls,
    ...ideas.flatMap((idea) => idea.source_urls),
  ]);

  const status: BriefStatus =
    ideas.length > 0 && source_urls.length > 0
      ? "verified"
      : ideas.length > 0
        ? "needs_review"
        : "needs_review";

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(BRIEFS_TABLE)
    .update({
      ideas,
      source_urls,
      status,
      verification_notes:
        structured.notes ||
        (status === "verified"
          ? `Verified ${ideas.length} angles.`
          : "Needs review: missing ideas or source URLs."),
      verified_at: status === "verified" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not verify brief.");
  }

  return mapBriefRow(data as Record<string, unknown>);
}

/** Load the best desk brief to complement a research lookback window. */
export async function loadDeskBriefForLookback(input: {
  lookbackStart: string;
  lookbackEnd: string;
}): Promise<WeeklyBrief | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(BRIEFS_TABLE)
    .select("*")
    .in("status", ["verified", "needs_review"])
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);
  const briefs = (data ?? []).map((row) => mapBriefRow(row as Record<string, unknown>));
  if (briefs.length === 0) return null;

  const overlapping = briefs.find((brief) => {
    if (!brief.lookback_start || !brief.lookback_end) return false;
    return (
      brief.lookback_start <= input.lookbackEnd &&
      brief.lookback_end >= input.lookbackStart
    );
  });

  return overlapping ?? briefs.find((brief) => brief.status === "verified") ?? briefs[0] ?? null;
}

/** Compact prompt block so research/discovery can lean on desk angles. */
export function formatDeskBriefForPrompt(brief: WeeklyBrief | null | undefined): string {
  if (!brief || brief.ideas.length === 0) return "";

  const angles = brief.ideas
    .slice(0, 8)
    .map((idea, index) => {
      const kind = idea.suggestion_type === "blog" ? "Blog" : "LinkedIn";
      const hook = idea.hook ? ` — ${idea.hook}` : "";
      return `${index + 1}. [${kind}] ${idea.title}${hook}`;
    })
    .join("\n");

  const urls = brief.source_urls.slice(0, 12).join("\n");

  return `DESK BRIEF (complementary Phrenos desk angles for this week — inspiration only.
Every curated story and draft must still be backed by in-period web sources from search/enrichment. Do not invent facts from the brief alone.)

Brief: ${brief.title}
Period: ${brief.lookback_start ?? "n/a"} to ${brief.lookback_end ?? "n/a"}
Status: ${brief.status}

Angles:
${angles}

${urls ? `Preferred source URLs if they appear in search:\n${urls}` : ""}`.trim();
}
