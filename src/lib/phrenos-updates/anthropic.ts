export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string; type?: string } };
    const message = body.error?.message ?? JSON.stringify(body);
    return message.slice(0, 400);
  } catch {
    const text = await response.text();
    return text.slice(0, 400);
  }
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Single text completion. Throws on API errors so callers can decide to retry or fall back. */
export async function callAnthropic(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await readApiError(response);
    throw new Error(`Anthropic API error (${response.status}) on model ${ANTHROPIC_MODEL}: ${detail}`);
  }

  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((entry) => entry.type === "text")?.text?.trim() ?? "";
}

/** Best-effort variant for non-critical calls such as fact extraction. */
export async function callAnthropicSafe(prompt: string, maxTokens: number): Promise<string> {
  try {
    return await callAnthropic(prompt, maxTokens);
  } catch (error) {
    console.error("Anthropic call failed:", error);
    return "";
  }
}

export function extractJsonArray(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (fenced?.[1]) return fenced[1];
  const match = text.match(/\[[\s\S]*\]/);
  return match?.[0] ?? null;
}

export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced?.[1]) return fenced[1];
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}
