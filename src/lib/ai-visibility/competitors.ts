// Finds who competes with a company for the same customers, so the list does not have to be typed. Claude searches the web, and a name is only
// kept when it comes with a page that the search really returned.
import { lines } from "@/lib/ai-visibility/score";
import type { Profile } from "@/lib/ai-visibility/profile";

export type FoundCompetitor = { name: string; why: string; url: string };
type Block = { type: string; [key: string]: unknown };
type Reply = { content?: Block[]; stop_reason?: string; error?: { message?: string } };

const MAX_LISTED = 20;

/** One short line: no dashes, and cut at a word rather than part way through one. */
export function tidy(text: string, max = 200): string {
  const plain = text.replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[,;:]$/, "")}...`;
}

async function call(body: Record<string, unknown>): Promise<Reply> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    signal: AbortSignal.timeout(100_000),
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", ...body }),
  });
  const data = (await response.json().catch(() => ({}))) as Reply;
  if (!response.ok) throw new Error(data.error?.message ?? `Claude returned ${response.status}.`);
  return data;
}

const key = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const hostOf = (url: string) => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** True when the site is one the search really returned, whichever of its pages came up. */
const seen = (hosts: Set<string>, url: string) => {
  const h = hostOf(url);
  return !!h && [...hosts].some((x) => x === h || x.endsWith(`.${h}`) || h.endsWith(`.${x}`));
};

const SYSTEM = `You find a company's real competitors: the businesses or products a customer would be shown, or an AI assistant would name, when they look for what this company offers. Use web search to confirm each one exists today and offers the same thing to the same kind of customer. Give each name as the public writes it, with one plain line of at most 25 words on why it competes, and its own website address (the home page of the competitor itself, not an article about it). Leave out the company itself, general categories, and anything you could not confirm on a real page. Prefer the ones named most often. No em dashes.`;

/** Up to ten competitors not already listed. */
export async function findCompetitors(profile: Profile, existing: string[], unexplained: string[] = [], discover = true): Promise<{ found: FoundCompetitor[]; explained: FoundCompetitor[] }> {
  const brief = "Competitors of Phrenos.ai: independent AI consultants and small consultancies that help business leaders with AI strategy, workflow automation, competitive intelligence, AI-powered content and AI training, mainly in the UK and Europe. Include boutique AI consultancies and independent consultants, and the AI training and enablement firms a leader would also be shown. Leave out the large global consultancies unless an assistant would plainly name them for this kind of work.";
  const messages: { role: "user" | "assistant"; content: unknown }[] = [
    { role: "user", content: `${brief}\n\nAbout the company: ${profile.about.slice(0, 2500)}\n\nAlready listed, so do not repeat these:\n${existing.map((n) => `- ${n}`).join("\n") || "none"}${unexplained.length > 0 ? `\n\nThese are already listed but we have no website or reason for them. Give each its own website and why it competes, in "listed":\n${unexplained.map((n) => `- ${n}`).join("\n")}` : ""}\n\n${discover ? "Search, then call submit_competitors with up to 10 new ones." : "Search for the listed ones only, then call submit_competitors with an empty competitors list and the details in listed."}` },
  ];
  const searched = new Set<string>();
  const hosts = new Set<string>();
  let found: FoundCompetitor[] | null = null;
  let listed: FoundCompetitor[] = [];
  for (let turn = 0; turn < 5 && !found; turn += 1) {
    const data = await call({
      max_tokens: 3000,
      system: SYSTEM,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 6 },
        {
          name: "submit_competitors",
          description: "The competitors found.",
          input_schema: { type: "object", properties: { competitors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, why: { type: "string" }, url: { type: "string" } }, required: ["name", "why", "url"] } }, listed: { type: "array", items: { type: "object", properties: { name: { type: "string" }, why: { type: "string" }, url: { type: "string" } }, required: ["name", "why", "url"] } } }, required: ["competitors"] },
        },
      ],
      messages,
    });
    const content = data.content ?? [];
    for (const block of content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) for (const r of block.content as { url?: string }[]) if (r.url) {
        searched.add(key(r.url));
        hosts.add(hostOf(r.url));
      }
    }
    const tool = content.find((b) => b.type === "tool_use" && b.name === "submit_competitors") as (Block & { input?: { competitors?: FoundCompetitor[]; listed?: FoundCompetitor[] } }) | undefined;
    if (tool) {
      found = tool.input?.competitors ?? [];
      listed = tool.input?.listed ?? [];
      break;
    }
    messages.push({ role: "assistant", content });
    if (data.stop_reason !== "pause_turn") messages.push({ role: "user", content: "Now call submit_competitors with what you confirmed on real pages." });
  }
  const have = new Set(existing.map((n) => n.toLowerCase()));
  const own = new Set(profile.names.map((n) => n.toLowerCase()));
  const out: FoundCompetitor[] = [];
  for (const c of found ?? []) {
    const name = (c.name ?? "").trim();
    if (!name || name.length > 80 || have.has(name.toLowerCase()) || own.has(name.toLowerCase())) continue;
    // Only a site the search really returned counts as evidence.
    if (!c.url || !seen(hosts, c.url)) continue;
    have.add(name.toLowerCase());
    out.push({ name, why: tidy(c.why ?? ""), url: c.url });
  }
  // Pages for names already on the list. Only the ones asked about, and only a page the search really returned.
  const asked = new Map(unexplained.map((n) => [n.toLowerCase(), n]));
  const explained: FoundCompetitor[] = [];
  for (const c of listed) {
    const name = asked.get((c.name ?? "").trim().toLowerCase());
    if (name && c.url && seen(hosts, c.url)) explained.push({ name, why: tidy(c.why ?? ""), url: c.url });
  }
  return { found: discover ? out.slice(0, 10) : [], explained };
}

/** The existing list with new names added, nothing removed, capped. */
export const mergeCompetitors = (existing: string[], added: string[]) => {
  const seen = new Set<string>();
  return lines([...existing, ...added]).filter((n) => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true))).slice(0, MAX_LISTED);
};
