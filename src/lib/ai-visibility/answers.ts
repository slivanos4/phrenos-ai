// Asks the assistants a customer's question, with no hint about the company, and records whether it appears. An answer through an API is
// a sample, not exactly what any one person sees, so the page shows the trend and the wording rather than any single result.
import { scoreAnswer, type Answer, type Engine, type Identity } from "@/lib/ai-visibility/score";
import { CHECKS_TABLE, type Client, type Profile } from "@/lib/ai-visibility/profile";

const ANSWER_PROMPT =
  "You are a helpful assistant answering a question from a member of the public. Search the web before you answer. Where it helps, recommend specific businesses by name and say where to find them. Keep it concise.";

type Block = { type: string; [key: string]: unknown };
type ClaudeResponse = { content?: Block[]; stop_reason?: string; error?: { message?: string } };

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());
export const chatGptConfigured = () => Boolean(process.env.OPENAI_API_KEY?.trim());
export const answerEngines = (): Engine[] => [...(claudeConfigured() ? (["claude"] as const) : []), ...(chatGptConfigured() ? (["chatgpt"] as const) : [])];

async function claude(body: Record<string, unknown>): Promise<ClaudeResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", ...body }),
  });
  const data = (await response.json().catch(() => ({}))) as ClaudeResponse;
  if (!response.ok) throw new Error(data.error?.message ?? `Claude returned ${response.status}.`);
  return data;
}

export async function askClaude(question: string): Promise<Answer> {
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: question }];
  let text = "";
  const urls = new Set<string>();
  const read = new Set<string>();
  for (let turn = 0; turn < 3; turn += 1) {
    const data = await claude({ max_tokens: 2500, system: ANSWER_PROMPT, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }], messages });
    for (const block of data.content ?? []) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const result of block.content as { url?: string }[]) if (result.url) read.add(result.url);
      }
      if (block.type !== "text") continue;
      text += String(block.text ?? "");
      for (const c of (block.citations as { url?: string }[] | undefined) ?? []) if (c.url) urls.add(c.url);
    }
    if (data.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: data.content ?? [] });
  }
  for (const m of text.matchAll(/\]\((https?:[^)\s]+)\)/g)) urls.add(m[1]);
  return { text, urls: [...urls], read: [...read] };
}

export function parseOpenAiAnswer(data: unknown): Answer {
  let text = "";
  const urls = new Set<string>();
  const output = (data as { output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[] }[] } | null)?.output ?? [];
  for (const item of output) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type !== "output_text") continue;
      text += c.text ?? "";
      for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) urls.add(a.url);
    }
  }
  return { text, urls: [...urls] };
}

export async function askChatGpt(question: string): Promise<Answer> {
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_SEARCH_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4.1";
  const send = (tool: string) =>
    fetch(`${base}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${(process.env.OPENAI_API_KEY ?? "").trim()}` },
      body: JSON.stringify({ model, tools: [{ type: tool }], input: question }),
      signal: AbortSignal.timeout(120_000),
    });
  let response = await send("web_search");
  // Older models only know the preview name for the search tool.
  if (response.status === 400) response = await send("web_search_preview");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[visibility:openai]", response.status, (data as { error?: { message?: string } })?.error?.message);
    throw new Error(`ChatGPT check failed (${response.status}).`);
  }
  return parseOpenAiAnswer(data);
}


/** Whether an answer that uses the company's name is describing the company, or another business that shares it. Fails to "unclear", never to "correct". */
export async function judgeIdentity(profile: Profile, answerText: string): Promise<{ identity: Identity; note: string }> {
  const body = {
    max_tokens: 300,
    system: "You check whether an AI assistant's answer is about the right business. You are given the business we mean and an answer that uses its name. Say whether the answer describes that business, a different business that shares or resembles the name, or whether it is impossible to tell. Judge by what the answer says the business does, who it serves and where it is. Say correct only when the description fits. Give one short plain reason. No em dashes.",
    tools: [{ name: "verdict", description: "The verdict.", input_schema: { type: "object", properties: { verdict: { type: "string", enum: ["correct", "confused", "unclear"] }, reason: { type: "string" } }, required: ["verdict", "reason"] } }],
    tool_choice: { type: "tool", name: "verdict" },
    messages: [{ role: "user", content: `The business we mean: ${profile.label}. ${profile.about.slice(0, 1200)}\nNames it goes by: ${profile.names.join(", ")}\n\nThe answer:\n${answerText.slice(0, 2500)}` }],
  };
  const models = [process.env.ANTHROPIC_JUDGE_MODEL?.trim() || "claude-haiku-5-5", process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"];
  for (const model of models) {
    try {
      const data = await claude({ ...body, model });
      const out = (data.content ?? []).find((b) => b.type === "tool_use") as (Block & { input?: { verdict?: string; reason?: string } }) | undefined;
      const verdict = out?.input?.verdict;
      if (verdict === "correct" || verdict === "confused" || verdict === "unclear") return { identity: verdict, note: String(out?.input?.reason ?? "").slice(0, 240) };
    } catch {
      // Try the next model.
    }
  }
  return { identity: "unclear", note: "The check of which business this describes could not be run." };
}

/** Runs one question on each connected assistant and stores what came back. A failed assistant is stored as an error, not as "not mentioned". */
export async function checkQuestion(supabase: Client, profile: Profile, question: { id: string; question: string }): Promise<string[]> {
  const failures: string[] = [];
  await Promise.all(
    answerEngines().map(async (engine) => {
      try {
        const answer = engine === "claude" ? await askClaude(question.question) : await askChatGpt(question.question);
        const scored = scoreAnswer(answer, profile.names, profile.competitors, profile.sites);
        // Our own site cited means it is about us. Named without that, so check which business the answer means.
        const who = scored.cited ? { identity: "correct" as Identity, note: "" } : scored.mentioned ? await judgeIdentity(profile, answer.text) : null;
        const { error } = await supabase.from(CHECKS_TABLE).insert({ question_id: question.id, engine, ...scored, identity: who?.identity ?? null, identity_note: who?.note || null });
        if (error) throw new Error(error.message);
      } catch (e) {
        const error = e instanceof Error ? e.message.slice(0, 300) : "The check failed.";
        failures.push(error);
        await supabase.from(CHECKS_TABLE).insert({ question_id: question.id, engine, error });
      }
    })
  );
  return failures;
}
