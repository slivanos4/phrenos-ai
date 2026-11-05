import { CHECKS_TABLE, QUESTIONS_TABLE, type Client } from "@/lib/ai-visibility/profile";
import { latestChecks, namedMostOften, summarise, type Check, type Engine, type Identity, type Summary } from "@/lib/ai-visibility/score";

type DbError = { code?: string; message?: string };
export type QuestionResult = { id: string; question: string; results: Partial<Record<Engine, Check>> };

type CheckRow = { question_id: string; engine: Engine; identity: Identity | null; identity_note: string | null; mentioned: boolean; cited: boolean; cited_urls: string[]; competitors: string[]; excerpt: string | null; error: string | null; checked_at: string };

/** Each tracked question with the newest successful answer from each assistant. */
export async function questionResults(supabase: Client): Promise<{ questions: QuestionResult[]; summary: Summary; rivals: { name: string; count: number }[] } | { error: DbError }> {
  const [q, c] = await Promise.all([
    supabase.from(QUESTIONS_TABLE).select("id, question, created_at").order("created_at"),
    supabase.from(CHECKS_TABLE).select("question_id, engine, identity, identity_note, mentioned, cited, cited_urls, competitors, excerpt, error, checked_at").order("checked_at", { ascending: false }).limit(1500),
  ]);
  if (q.error) return { error: q.error };
  if (c.error) return { error: c.error };
  const latest = latestChecks((c.data ?? []) as CheckRow[]);
  const questions = (q.data ?? []).map((row) => ({
    id: row.id as string,
    question: row.question as string,
    results: Object.fromEntries(
      latest.filter((l) => l.question_id === row.id).map((l) => [l.engine, { identity: l.identity ?? null, identity_note: l.identity_note ?? null, mentioned: l.mentioned, cited: l.cited, cited_urls: l.cited_urls ?? [], competitors: l.competitors ?? [], excerpt: l.excerpt, error: null, checked_at: l.checked_at } satisfies Check]),
    ),
  }));
  return { questions, summary: summarise(latest), rivals: namedMostOften(latest.map((l) => ({ competitors: l.competitors ?? [] }))) };
}
