// AI visibility: reading an assistant's answer. No database or network in here, so it can be tested and used by the server and the page alike.

export type Engine = "claude" | "chatgpt";
export const ENGINE_LABELS: Record<Engine, string> = { claude: "Claude", chatgpt: "ChatGPT" };
export const MAX_QUESTIONS = 20;
/** Each run spends real credit on two assistants, so a subject gets one full pass of every question a day. */
export const RUNS_PER_DAY = MAX_QUESTIONS * 2;

/** urls = what the answer cited. read = pages it searched, kept when it cites nothing. */
export type Answer = { text: string; urls: string[]; read?: string[] };
/** For an answer that names the company: whether it is about the company, another business sharing the name, or cannot be told. */
export type Identity = "correct" | "confused" | "unclear";
export type Check = { identity: Identity | null; identity_note: string | null; mentioned: boolean; cited: boolean; cited_urls: string[]; competitors: string[]; excerpt: string | null; error: string | null; checked_at: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-sensitive on purpose: "Ivy" is a name, "ivy" is a plant. */
export const namedIn = (text: string, name: string) => !!name.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name.trim())}($|[^\\p{L}\\p{N}])`, "u").test(text);

const host = (u: string) => {
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
export const isOwnUrl = (url: string, site: string) => {
  const h = host(url);
  const own = host(site);
  return !!own && (h === own || h.endsWith(`.${own}`));
};

/** Answers come back in Markdown; the excerpt is read as plain text. */
export function plainExcerpt(text: string): string {
  return text
    .replace(/\(\[[^\]]*\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, "")
    .replace(/[*#|`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

/** Whether the answer names the company or cites its site, and which competitors it names. */
export function scoreAnswer(answer: Answer, names: string[], competitors: string[], sites: string[]) {
  // A name written as a domain also counts as the company's own site.
  const own = [...sites, ...names.filter((n) => /^[\w-]+(\.[\w-]+)+$/.test(n))].filter(Boolean);
  const cited = answer.urls.some((u) => own.some((s) => isOwnUrl(u, s)));
  return {
    mentioned: cited || names.some((n) => namedIn(answer.text, n)),
    cited,
    cited_urls: (answer.urls.length ? answer.urls : answer.read ?? []).slice(0, 12),
    competitors: competitors.filter((c) => namedIn(answer.text, c)),
    excerpt: plainExcerpt(answer.text),
  };
}

export type Latest = { question_id: string; engine: Engine } & Check;

/** The newest check for each question on each assistant. Checks that failed are skipped, so one outage does not read as "not mentioned". */
export function latestChecks<T extends { question_id: string; engine: string; checked_at: string; error: string | null }>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    if (row.error) continue;
    const key = `${row.question_id}:${row.engine}`;
    const have = best.get(key);
    if (!have || Date.parse(row.checked_at) > Date.parse(have.checked_at)) best.set(key, row);
  }
  return [...best.values()];
}

/** `mentioned` counts only answers that name the company and are about it; `confused` are answers that name it but describe another business. */
export type Summary = { answers: number; mentioned: number; confused: number; cited: number; competitorsNamed: number; checkedAt: string | null };

/** Named and about us. Checks from before identity was recorded count as correct. */
export const namedCorrectly = (c: { mentioned: boolean; identity?: string | null }) => c.mentioned && c.identity !== "confused";
export const confusedWithOther = (c: { mentioned: boolean; identity?: string | null }) => c.mentioned && c.identity === "confused";

export function summarise(latest: { mentioned: boolean; identity?: string | null; cited: boolean; competitors: string[]; checked_at: string }[]): Summary {
  let checkedAt: string | null = null;
  for (const c of latest) if (!checkedAt || Date.parse(c.checked_at) > Date.parse(checkedAt)) checkedAt = c.checked_at;
  return {
    answers: latest.length,
    mentioned: latest.filter(namedCorrectly).length,
    confused: latest.filter(confusedWithOther).length,
    cited: latest.filter((c) => c.cited).length,
    competitorsNamed: latest.filter((c) => c.competitors.length > 0).length,
    checkedAt,
  };
}

/** The plain-English line over the results. */
export function headline(s: Summary): string {
  if (s.answers === 0) return "No answers checked yet.";
  const confused = s.confused > 0 ? ` In ${s.confused} more it was confused with another business.` : "";
  return `Named correctly in ${s.mentioned} of ${s.answers} latest answer${s.answers === 1 ? "" : "s"}${s.cited > 0 ? `, and your own site was cited in ${s.cited}` : ""}.${confused}`;
}

export const lines = (value: string[] | null | undefined) => (value ?? []).map((v) => v.trim()).filter(Boolean);

/** The competitors named across the latest answers, most often first. */
export function namedMostOften(latest: { competitors: string[] }[], top = 5): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of latest) for (const name of c.competitors) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, top);
}
