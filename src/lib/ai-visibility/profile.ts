import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { lines } from "@/lib/ai-visibility/score";

/** Who is being checked: Phrenos.ai. The names to look for are its own plus any added by hand. */
export const SITE = "phrenosai.com";
export const OWN_NAMES = ["Phrenos.ai", "Phrenos", SITE, "Sophia Livanos"];
export const SETTINGS_TABLE = "phrenos_visibility_settings";
export const QUESTIONS_TABLE = "phrenos_visibility_questions";
export const CHECKS_TABLE = "phrenos_visibility_checks";
export const MIGRATION_MESSAGE = "AI visibility is not set up yet. Run supabase/migrations/011_ai_visibility.sql in Supabase, then refresh.";

export type Client = ReturnType<typeof createServiceRoleClient>;
export type CompetitorNotes = Record<string, { why: string; url: string }>;
export type Settings = { names: string[]; competitors: string[]; competitor_notes: CompetitorNotes; website: string | null; advice: unknown | null; advice_at: string | null };
export type Profile = { label: string; names: string[]; competitors: string[]; sites: string[]; about: string };

export const ABOUT = `Phrenos.ai (phrenosai.com) is an independent AI consultancy run by Sophia Livanos. It helps business leaders introduce Generative AI, data and automation, stay ahead and expand, from the first strategy to the systems and training that keep it working. Services: AI Strategy & Adoption; Intelligent Workflow Automation; AI-Powered Content & Digital Systems; Competitive Intelligence & Analytics; AI Training & Team Enablement. Proof: more than 40 custom GPTs and AI assistants built, and five AI systems in its portfolio (Competitive Intelligence, Brand Review Governance, Content Buddy, Content & Data Hub, Monthly Report Automation), taking report building and competitor research from days to minutes. It offers a free 15-minute intro call, a free AI readiness check, and a fortnightly AI Updates feed of news and analysis for business leaders. It works as one-off projects, ongoing support, workshops, training and talks.`;

/** The settings row, created on first use. */
export async function ensureSettings(supabase: Client): Promise<{ settings: Settings | null; error?: { code?: string; message?: string } }> {
  const found = await supabase.from(SETTINGS_TABLE).select("*").eq("id", 1).maybeSingle();
  if (found.error) return { settings: null, error: found.error };
  if (found.data) return { settings: found.data as Settings };
  const created = await supabase.from(SETTINGS_TABLE).upsert({ id: 1, website: SITE }).select("*").single();
  if (created.error) return { settings: null, error: created.error };
  return { settings: created.data as Settings };
}

export function profileFor(settings: Settings): Profile {
  return {
    label: "Phrenos.ai",
    names: [...new Set([...OWN_NAMES, ...lines(settings.names)])],
    competitors: lines(settings.competitors),
    sites: [settings.website || SITE],
    about: ABOUT,
  };
}

/** Questions a prospective client would type into an assistant, written by Claude. Never names the company except one or two on purpose. */
export async function suggestQuestions(profile: Profile, existing: string[], count = 10): Promise<string[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1500,
      system: `You write the questions people type into an AI assistant such as ChatGPT or Claude when they are looking for help with AI in their business. Write ${count} questions from business leaders, founders and heads of marketing, operations or data at small and mid-sized companies, mostly in the UK and Europe. Cover the real things this consultancy does, each one a question its services answer: the problem as the leader feels it ("how do we stop spending days on monthly reporting"), a request for a person or firm ("best independent AI consultant for a mid-sized company"), a comparison or alternative ("AI consultancy or hiring an in-house AI lead"), a how-to that an article could answer ("how to train a marketing team to use ChatGPT safely"), and a few about the category ("what is an AI readiness assessment"). Include some that name an industry or company size, and some about the UK. One or two may ask what Phrenos.ai is, but the rest must not name it. Plain words, the way a person types. No em dashes.`,
      tools: [{ name: "submit_questions", description: "The suggested questions.", input_schema: { type: "object", properties: { questions: { type: "array", items: { type: "string" } } }, required: ["questions"] } }],
      tool_choice: { type: "tool", name: "submit_questions" },
      messages: [{ role: "user", content: `About the company: ${profile.about}\n\nQuestions already tracked, so do not repeat them:\n${existing.map((q) => `- ${q}`).join("\n") || "none"}` }],
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { content?: { type: string; input?: { questions?: string[] } }[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Claude returned ${response.status}.`);
  const questions = data.content?.find((b) => b.type === "tool_use")?.input?.questions ?? [];
  const seen = new Set(existing.map((q) => q.toLowerCase()));
  return questions.map((q) => q.trim()).filter((q) => q.length >= 5 && q.length <= 300 && !seen.has(q.toLowerCase())).slice(0, count);
}
