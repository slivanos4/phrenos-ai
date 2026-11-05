import { NextResponse } from "next/server";
import { AdminAuthError, createServiceRoleClient, errorResponse, requireAdminSession } from "@/lib/phrenos-updates";
import { buildAdvice, type Advice } from "@/lib/ai-visibility/advice";
import { answerEngines, checkQuestion, claudeConfigured } from "@/lib/ai-visibility/answers";
import { findCompetitors, mergeCompetitors } from "@/lib/ai-visibility/competitors";
import { CHECKS_TABLE, MIGRATION_MESSAGE, QUESTIONS_TABLE, SETTINGS_TABLE, ensureSettings, profileFor, suggestQuestions } from "@/lib/ai-visibility/profile";
import { questionResults, type QuestionResult } from "@/lib/ai-visibility/server";
import { MAX_QUESTIONS, RUNS_PER_DAY, lines, type Engine, type Summary } from "@/lib/ai-visibility/score";

export const dynamic = "force-dynamic";
// One question on two assistants, each searching the web.
export const maxDuration = 120;

/** How many new questions each check adds, until the limit is reached. */
const NEW_PER_CHECK = 5;

export type VisibilityState = {
  label: string;
  names: string[];
  extraNames: string[];
  competitors: string[];
  competitorNotes: Record<string, { why: string; url: string }>;
  website: string;
  engines: Engine[];
  questions: QuestionResult[];
  summary: Summary;
  rivals: { name: string; count: number }[];
  advice: { current: Advice | null; at: string | null };
};

type DbError = { code?: string; message?: string };
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const list = (value: unknown, max = 40) => (Array.isArray(value) ? lines(value.map((v) => clean(v, 120))).slice(0, max) : []);

function failure(error: DbError, what: string): Response {
  if (error.code === "42P01" || error.code === "PGRST205" || /phrenos_visibility_/.test(error.message ?? "")) return NextResponse.json({ error: MIGRATION_MESSAGE }, { status: 503 });
  console.error(`AI visibility: ${what} failed:`, error.code ?? "", error.message ?? "");
  return NextResponse.json({ error: `Could not ${what}.` }, { status: 500 });
}

function aiFailure(error: unknown, fallback: string): Response {
  const message = error instanceof Error ? error.message : "";
  console.error("AI visibility:", message);
  if (/credit balance is too low/i.test(message)) return NextResponse.json({ error: "Claude's credit balance is used up, so this cannot run until it is topped up." }, { status: 402 });
  return NextResponse.json({ error: fallback }, { status: 502 });
}

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const supabase = createServiceRoleClient();
    const { settings, error } = await ensureSettings(supabase);
    if (error || !settings) return failure(error ?? {}, "open AI visibility");
    const profile = profileFor(settings);
    const results = await questionResults(supabase);
    if ("error" in results) return failure(results.error, "read the results");
    return NextResponse.json({
      label: profile.label,
      names: profile.names,
      extraNames: lines(settings.names),
      competitors: profile.competitors,
      competitorNotes: settings.competitor_notes ?? {},
      website: profile.sites[0] ?? "",
      engines: answerEngines(),
      ...results,
      advice: { current: (settings.advice as Advice | null) ?? null, at: settings.advice_at },
    } satisfies VisibilityState);
  } catch (error) {
    return handle(error);
  }
}

function handle(error: unknown): Response {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Something went wrong";
  const { body, status } = errorResponse(message);
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return bad("Invalid request.");
    const action = clean(body.action, 20);
    const supabase = createServiceRoleClient();
    const { settings, error: settingsError } = await ensureSettings(supabase);
    if (settingsError || !settings) return failure(settingsError ?? {}, "open AI visibility");
    const profile = profileFor(settings);
    const touch = { updated_at: new Date().toISOString() };

    if (action === "save") {
      const { error } = await supabase.from(SETTINGS_TABLE).update({ names: list(body.names), competitors: list(body.competitors), website: clean(body.website, 200) || settings.website, ...touch }).eq("id", 1);
      return error ? failure(error, "save") : NextResponse.json({ ok: true });
    }

    if (action === "add") {
      const questions = list(body.questions, MAX_QUESTIONS).filter((q) => q.length >= 5);
      if (questions.length === 0) return bad("Write a question of at least 5 characters.");
      const { count } = await supabase.from(QUESTIONS_TABLE).select("id", { count: "exact", head: true });
      if ((count ?? 0) + questions.length > MAX_QUESTIONS) return bad(`You can track up to ${MAX_QUESTIONS} questions.`);
      const { error } = await supabase.from(QUESTIONS_TABLE).upsert(questions.map((question) => ({ question })), { onConflict: "question", ignoreDuplicates: true });
      return error ? failure(error, "save the questions") : NextResponse.json({ ok: true });
    }

    if (action === "remove") {
      const { error } = await supabase.from(QUESTIONS_TABLE).delete().eq("id", clean(body.id, 50));
      return error ? failure(error, "remove the question") : NextResponse.json({ ok: true });
    }

    if (action === "suggest" || action === "topup") {
      if (!claudeConfigured()) return bad("Claude is not connected yet.", 503);
      const existing = await supabase.from(QUESTIONS_TABLE).select("question");
      if (existing.error) return failure(existing.error, "read the questions");
      const have = (existing.data ?? []).map((r) => r.question as string);
      try {
        if (action === "suggest") return NextResponse.json({ questions: await suggestQuestions(profile, have) });
        const room = MAX_QUESTIONS - have.length;
        if (room <= 0) return NextResponse.json({ added: 0 });
        const fresh = await suggestQuestions(profile, have, Math.min(NEW_PER_CHECK, room));
        if (fresh.length > 0) {
          const { error } = await supabase.from(QUESTIONS_TABLE).upsert(fresh.map((question) => ({ question })), { onConflict: "question", ignoreDuplicates: true });
          if (error) return failure(error, "save the questions");
        }
        return NextResponse.json({ added: fresh.length });
      } catch (e) {
        return aiFailure(e, "Could not write questions. Please try again.");
      }
    }

    if (action === "competitors" || action === "explain") {
      if (!claudeConfigured()) return bad("Claude is not connected yet.", 503);
      try {
        const notes = settings.competitor_notes ?? {};
        const { found, explained } = await findCompetitors(profile, profile.competitors, profile.competitors.filter((n) => !notes[n]), action === "competitors");
        if (found.length > 0) {
          const { error } = await supabase.from(SETTINGS_TABLE).update({ competitors: mergeCompetitors(profile.competitors, found.map((c) => c.name)), ...touch }).eq("id", 1);
          if (error) return failure(error, "save the competitors");
        }
        if (found.length > 0 || explained.length > 0) {
          const merged = { ...notes, ...Object.fromEntries([...explained, ...found].map((c) => [c.name, { why: c.why, url: c.url }])) };
          await supabase.from(SETTINGS_TABLE).update({ competitor_notes: merged }).eq("id", 1);
        }
        return NextResponse.json({ found });
      } catch (e) {
        return aiFailure(e, "Could not find competitors. Please try again.");
      }
    }

    if (action === "add_competitor") {
      const name = clean(body.name, 80);
      if (name.length < 2) return bad("Write the competitor's name.");
      if (profile.competitors.some((c) => c.toLowerCase() === name.toLowerCase())) return bad(`${name} is already on the list.`);
      const { error } = await supabase.from(SETTINGS_TABLE).update({ competitors: mergeCompetitors(profile.competitors, [name]), ...touch }).eq("id", 1);
      if (error) return failure(error, "save the competitor");
      if (!claudeConfigured()) return NextResponse.json({ name, note: null });
      try {
        const { explained } = await findCompetitors(profile, profile.competitors, [name], false);
        const note = explained[0] ? { why: explained[0].why, url: explained[0].url } : null;
        if (note) await supabase.from(SETTINGS_TABLE).update({ competitor_notes: { ...(settings.competitor_notes ?? {}), [name]: note } }).eq("id", 1);
        return NextResponse.json({ name, note });
      } catch (e) {
        return aiFailure(e, "Added to the list, but the lookup failed. It will be tried again.");
      }
    }

    if (action === "advise") {
      if (!claudeConfigured()) return bad("Claude is not connected yet.", 503);
      const results = await questionResults(supabase);
      if ("error" in results) return failure(results.error, "read the results");
      if (results.summary.answers === 0) return bad("Check some questions first, so the suggestions have answers to work from.");
      try {
        const advice = await buildAdvice({ questions: results.questions, about: profile.about });
        const at = new Date().toISOString();
        const { error } = await supabase.from(SETTINGS_TABLE).update({ advice, advice_at: at }).eq("id", 1);
        if (error) return failure(error, "save the suggestions");
        return NextResponse.json({ advice, at });
      } catch (e) {
        return aiFailure(e, "Could not work out the suggestions. Please try again.");
      }
    }

    if (action === "run") {
      if (answerEngines().length === 0) return bad("No assistant is connected yet. Add ANTHROPIC_API_KEY or OPENAI_API_KEY.", 503);
      const { data: question } = await supabase.from(QUESTIONS_TABLE).select("id, question").eq("id", clean(body.id, 50)).maybeSingle();
      if (!question) return bad("That question is gone.", 404);
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count, error } = await supabase.from(CHECKS_TABLE).select("id", { count: "exact", head: true }).gte("checked_at", since);
      if (error) return failure(error, "run the check");
      if ((count ?? 0) >= RUNS_PER_DAY * 2) return bad("That is today's limit for AI answer checks. Try again tomorrow.", 429);
      const failures = await checkQuestion(supabase, profile, { id: question.id as string, question: question.question as string });
      if (failures.length > 0 && failures.length === answerEngines().length) return aiFailure(new Error(failures[0]), "Something went wrong. Please try again.");
      return NextResponse.json({ ok: true });
    }

    return bad("Unknown action.");
  } catch (error) {
    return handle(error);
  }
}
