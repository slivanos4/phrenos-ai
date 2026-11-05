// Suggestions for getting named in AI answers: Claude reads where we are missing, who is named or cited instead and what our own site already
// covers, then says what to write or fix. Nothing here edits the site; it is advice for a person to act on.
import sitemap from "@/app/sitemap";
import type { QuestionResult } from "@/lib/ai-visibility/server";
import { ENGINE_LABELS, isOwnUrl, type Engine } from "@/lib/ai-visibility/score";
import { SITE } from "@/lib/ai-visibility/profile";

export type Gap = { theme: string; questions: string[]; why: string; action: string; format: "new page" | "improve a page" | "FAQ" | "comparison" | "guide" | "video"; title: string; outline: string[]; priority: "high" | "medium" | "low" };
export type Advice = { summary: string; gaps: Gap[]; offsite: { where: string; how: string }[]; basics: string[] };

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** The sites the assistants cited most across all answers, other than our own. These are where being mentioned would count. */
export function topCitedSites(questions: QuestionResult[], own: string, top = 8): { site: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const q of questions) for (const r of Object.values(q.results)) for (const u of r?.cited_urls ?? []) {
    const h = host(u);
    if (h && !isOwnUrl(u, own)) counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return [...counts.entries()].map(([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count).slice(0, top);
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** What our public pages already say, from each page's title and description. A page that cannot be read is simply left out. */
export async function ownPages(limit = 40): Promise<{ url: string; title: string; description: string }[]> {
  let urls: string[] = [];
  try {
    urls = (await sitemap()).map((e) => e.url);
  } catch {
    return [];
  }
  // Every top-level page, then a spread of the articles and videos.
  const fixed = urls.filter((u) => !/\/ai-updates\/[^/]+$/.test(u));
  const rest = urls.filter((u) => /\/ai-updates\/[^/]+$/.test(u));
  const chosen = [...fixed, ...rest].slice(0, limit);
  const pages = await Promise.all(
    chosen.map(async (url) => {
      try {
        const html = await (await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "PhrenosVisibilityCheck" } })).text();
        const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
        const description = decode(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "").trim();
        return { url, title, description };
      } catch {
        return null;
      }
    })
  );
  return pages.filter((p): p is { url: string; title: string; description: string } => !!p && !!p.title);
}

const summarise = (questions: QuestionResult[]) =>
  questions
    .map((q) => {
      const rows = (Object.keys(q.results) as Engine[]).map((e) => {
        const r = q.results[e]!;
        const status = r.cited ? "cited" : r.mentioned && r.identity === "confused" ? `CONFUSED with another business${r.identity_note ? ` (${r.identity_note})` : ""}` : r.mentioned ? "mentioned" : "NOT mentioned";
        const others = r.competitors.length > 0 ? ` (named instead: ${r.competitors.join(", ")})` : "";
        return `${ENGINE_LABELS[e]}: ${status}${others}. Said: ${(r.excerpt ?? "").slice(0, 320)}`;
      });
      return `Q: ${q.question}\n${rows.length > 0 ? rows.join("\n") : "Not checked yet."}`;
    })
    .join("\n\n");

export async function buildAdvice(input: { questions: QuestionResult[]; about: string }): Promise<Advice> {
  const pages = await ownPages();
  const cited = topCitedSites(input.questions, SITE);
  const prompt = [
    `About Phrenos.ai:\n${input.about}`,
    `What our public site covers now (${pages.length} pages):\n${pages.map((p) => `- ${p.url} | ${p.title}${p.description ? ` | ${p.description}` : ""}`).join("\n") || "Could not read the site."}`,
    `The sites the assistants cited most when answering these questions:\n${cited.map((c) => `- ${c.site} (${c.count})`).join("\n") || "None recorded."}`,
    `The questions we track and how each assistant answered:\n${summarise(input.questions)}`,
  ].join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    signal: AbortSignal.timeout(110_000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 5000,
      system: `You advise Phrenos.ai, an independent AI consultancy, on being named when someone asks an AI assistant a question. Be concrete and honest. Group the questions we are missing from into themes. Where an answer names us but describes a different business with a similar name, treat that as its own theme: say how our pages can make plain who we are (what we do, who for, where) so the two are not mixed up. For each theme say why we are not named, using the evidence given (who is named or cited instead, what our site lacks), then what to publish or fix: a format, a working title, and an outline of the headings. Prefer pages that answer the question in the first lines, in plain words, with specifics a person can check, such as the case studies on /work and the AI Updates articles; name the service and what it does for which kind of business and leader. Use only what the company description and site list say about us: never invent services, clients, numbers, prices or awards. Say what to do off our own site as well, such as where the cited sites are and how we could be included there truthfully. Basics are short and specific to us, not generic. No em dashes. British spelling.`,
      tools: [
        {
          name: "submit_advice",
          description: "The suggestions.",
          input_schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Two or three sentences on where we stand and the main reason." },
              gaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    theme: { type: "string" },
                    questions: { type: "array", items: { type: "string" }, description: "The tracked questions this covers, word for word." },
                    why: { type: "string" },
                    action: { type: "string" },
                    format: { type: "string", enum: ["new page", "improve a page", "FAQ", "comparison", "guide", "video"] },
                    title: { type: "string" },
                    outline: { type: "array", items: { type: "string" } },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["theme", "questions", "why", "action", "format", "title", "outline", "priority"],
                },
              },
              offsite: { type: "array", items: { type: "object", properties: { where: { type: "string" }, how: { type: "string" } }, required: ["where", "how"] } },
              basics: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "gaps", "offsite", "basics"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "submit_advice" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { content?: { type: string; input?: Advice }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Claude returned ${response.status}.`);
  const advice = data.content?.find((b) => b.type === "tool_use")?.input;
  if (!advice || !Array.isArray(advice.gaps)) throw new Error("Claude did not return suggestions.");
  return { summary: advice.summary ?? "", gaps: advice.gaps, offsite: advice.offsite ?? [], basics: advice.basics ?? [] };
}
