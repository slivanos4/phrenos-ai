import { callAnthropic, extractJsonObject } from "@/lib/phrenos-updates/anthropic";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import {
  RUNS_TABLE,
  SOURCES_TABLE,
  STORIES_TABLE,
  SUGGESTIONS_TABLE,
} from "@/lib/phrenos-updates/tables";
import { generateContentForStory } from "@/lib/phrenos-updates/run-research";
import type { ResearchSection } from "@/lib/phrenos-updates/types";
import { WEEK_HERO_TAG } from "@/lib/phrenos-updates/week-hero-shared";
import {
  textClaimsDateOutsideLookback,
  type SourceLookback,
} from "@/lib/phrenos-updates/source-dates";

export {
  hasFeaturedBlogDraft,
  isWeekHeroStory,
  WEEK_HERO_TAG,
} from "@/lib/phrenos-updates/week-hero-shared";

type HeroCandidate = {
  id: string;
  section: ResearchSection;
  title: string;
  summary_html: string | null;
  topic_tags: string[] | null;
  sort_order: number;
  source_count: number;
  fact_count: number;
  latest_published_at: string | null;
  stale_period_claim: boolean;
};

function scoreHeroCandidate(story: HeroCandidate): number {
  if (story.stale_period_claim) return -100;

  const tags = (story.topic_tags ?? []).map((tag) => tag.toLowerCase());
  let score = 0;

  if (tags.includes("eye-opening")) score += 5;
  if (tags.includes("agentic")) score += 3;
  if (tags.includes("enterprise")) score += 4;
  if (tags.includes("regulation") || tags.includes("safety")) score += 3;
  if (tags.includes("multimodal") || tags.includes("research")) score += 2;
  if (story.section === "products_industry") score += 2;
  if (story.section === "models_research") score += 1;

  score += Math.min(story.source_count, 5);
  score += Math.min(story.fact_count, 6) * 1.5;

  const summaryLength = (story.summary_html ?? "").replace(/<[^>]+>/g, "").trim().length;
  if (summaryLength > 280) score += 2;
  if (summaryLength > 480) score += 1;

  if (story.latest_published_at) score += 3;

  score += Math.max(0, 3 - story.sort_order) * 0.4;

  return score;
}

function pickHeroByHeuristic(stories: HeroCandidate[]): HeroCandidate {
  const viable = stories.filter((story) => !story.stale_period_claim);
  const pool = viable.length > 0 ? viable : stories;
  return [...pool].sort((left, right) => {
    const scoreDiff = scoreHeroCandidate(right) - scoreHeroCandidate(left);
    if (scoreDiff !== 0) return scoreDiff;
    return left.sort_order - right.sort_order;
  })[0]!;
}

async function pickHeroWithClaude(
  stories: HeroCandidate[],
  lookback: SourceLookback
): Promise<HeroCandidate | null> {
  const viable = stories.filter((story) => !story.stale_period_claim);
  const pool = viable.length > 0 ? viable : stories;

  const prompt = `You are choosing ONE primary story for Phrenos.ai's weekly Gen AI update.

Research period: ${lookback.lookbackStart} to ${lookback.lookbackEnd}.
Pick the single most WOW, influential, and converting topic for a global business audience.
Prioritise: strategic surprise, practical implication for organisations, and conversion potential for a featured blog on phrenosai.com (Why this matters now + What to do next).
Never pick a story that is clearly about an older month outside this research period.
Avoid rumour-only or unverifiable sensational claims.

Stories:
${JSON.stringify(
  pool.map((story) => ({
    id: story.id,
    section: story.section,
    title: story.title,
    topic_tags: story.topic_tags ?? [],
    source_count: story.source_count,
    fact_count: story.fact_count,
    latest_published_at: story.latest_published_at,
    summary: (story.summary_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 420),
  })),
  null,
  2
)}

Return ONLY JSON: {"story_id":"<id>","reason":"one short sentence"}`;

  const text = await callAnthropic(prompt, 400);
  const json = extractJsonObject(text);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as { story_id?: string };
    const match = pool.find((story) => story.id === parsed.story_id);
    return match ?? null;
  } catch {
    return null;
  }
}

async function loadHeroCandidates(
  runId: string,
  lookback: SourceLookback
): Promise<HeroCandidate[]> {
  const supabase = createServiceRoleClient();

  const { data: stories, error } = await supabase
    .from(STORIES_TABLE)
    .select("id, section, title, summary_html, topic_tags, sort_order")
    .eq("run_id", runId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  if (!stories?.length) return [];

  const storyIds = stories.map((story) => story.id as string);
  const { data: sources } = await supabase
    .from(SOURCES_TABLE)
    .select("story_id, extracted_facts, published_at")
    .in("story_id", storyIds);

  return stories.map((story) => {
    const storySources = (sources ?? []).filter((row) => row.story_id === story.id);
    const publishedDates = storySources
      .map((row) => row.published_at as string | null)
      .filter((value): value is string => Boolean(value))
      .sort();
    const summary = (story.summary_html as string | null) ?? null;
    const title = story.title as string;
    return {
      id: story.id as string,
      section: story.section as ResearchSection,
      title,
      summary_html: summary,
      topic_tags: (story.topic_tags as string[] | null) ?? null,
      sort_order: (story.sort_order as number) ?? 0,
      source_count: storySources.length,
      fact_count: storySources.filter((row) => Boolean(row.extracted_facts)).length,
      latest_published_at: publishedDates.at(-1) ?? null,
      stale_period_claim: textClaimsDateOutsideLookback(
        `${title}\n${summary ?? ""}`,
        lookback
      ),
    };
  });
}

async function markWeekHero(storyId: string, runId: string, currentTags: string[] | null) {
  const supabase = createServiceRoleClient();

  const { data: siblings } = await supabase
    .from(STORIES_TABLE)
    .select("id, topic_tags")
    .eq("run_id", runId);

  for (const sibling of siblings ?? []) {
    const tags = ((sibling.topic_tags as string[] | null) ?? []).filter(
      (tag) => tag !== WEEK_HERO_TAG
    );
    if (sibling.id === storyId) continue;
    const previous = (sibling.topic_tags as string[] | null) ?? [];
    if (previous.includes(WEEK_HERO_TAG)) {
      await supabase.from(STORIES_TABLE).update({ topic_tags: tags }).eq("id", sibling.id);
    }
  }

  const nextTags = Array.from(
    new Set([...(currentTags ?? []).filter((tag) => tag !== WEEK_HERO_TAG), WEEK_HERO_TAG])
  );

  await supabase.from(STORIES_TABLE).update({ topic_tags: nextTags }).eq("id", storyId);
}

/**
 * After research: pick the week's most converting story and auto-write its featured blog.
 * Best-effort: research success must not fail if drafting fails.
 */
export async function generateWeekHeroContent(runId: string): Promise<{
  storyId: string | null;
  title: string | null;
  drafted: boolean;
  error?: string;
}> {
  const supabase = createServiceRoleClient();
  const { data: run } = await supabase
    .from(RUNS_TABLE)
    .select("lookback_start, lookback_end")
    .eq("id", runId)
    .maybeSingle();

  const lookback: SourceLookback = {
    lookbackStart: (run?.lookback_start as string) ?? "",
    lookbackEnd: (run?.lookback_end as string) ?? "",
  };

  const candidates = await loadHeroCandidates(runId, lookback);
  if (candidates.length === 0) {
    return { storyId: null, title: null, drafted: false, error: "No stories to feature." };
  }

  let hero = pickHeroByHeuristic(candidates);
  try {
    const chosen = await pickHeroWithClaude(candidates, lookback);
    if (chosen) hero = chosen;
  } catch (error) {
    console.error("Week-hero Claude selection failed; using heuristic:", error);
  }

  await markWeekHero(hero.id, runId, hero.topic_tags);

  const { data: existingBlog } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("id")
    .eq("story_id", hero.id)
    .eq("suggestion_type", "blog")
    .eq("is_full_draft", true)
    .limit(1);

  if (existingBlog?.length) {
    return { storyId: hero.id, title: hero.title, drafted: true };
  }

  try {
    await generateContentForStory(hero.id, { mode: "hero-blog" });
    return { storyId: hero.id, title: hero.title, drafted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Featured blog draft failed.";
    console.error(`Week-hero draft failed for "${hero.title}":`, message);
    return { storyId: hero.id, title: hero.title, drafted: false, error: message };
  }
}
