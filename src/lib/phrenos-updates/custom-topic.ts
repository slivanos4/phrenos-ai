import { researchCustomTopic, type BriefClaimCheck } from "@/lib/phrenos-updates/research-agent";
import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import { RUNS_TABLE, SOURCES_TABLE, STORIES_TABLE } from "@/lib/phrenos-updates/tables";
import {
  CUSTOM_RUN_LOOKBACK,
  type GeneratedStory,
  type ResearchSection,
} from "@/lib/phrenos-updates/types";

// An old fixed timestamp keeps the weekly "drafting now" banner and ordering logic away from this run.
const CUSTOM_RUN_TIMESTAMP = "2000-01-01T00:00:00.000Z";

/** All custom-topic stories live in one persistent run, so weekly re-runs can never wipe them. */
async function getOrCreateCustomRun(): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from(RUNS_TABLE)
    .select("id")
    .eq("lookback_start", CUSTOM_RUN_LOOKBACK)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const base = {
    status: "completed",
    lookback_start: CUSTOM_RUN_LOOKBACK,
    lookback_end: CUSTOM_RUN_LOOKBACK,
    started_at: CUSTOM_RUN_TIMESTAMP,
    completed_at: CUSTOM_RUN_TIMESTAMP,
  };

  // The trigger_type column may only accept the original values, so fall back if "custom" is refused.
  for (const trigger_type of ["custom", "manual"]) {
    const { data, error } = await supabase
      .from(RUNS_TABLE)
      .insert({ ...base, trigger_type })
      .select("id")
      .single();
    if (data && !error) return data.id as string;
  }
  throw new Error("Could not create the Custom topics batch.");
}

async function saveCustomTopicStory(story: GeneratedStory) {
  const supabase = createServiceRoleClient();
  const runId = await getOrCreateCustomRun();

  const { count } = await supabase
    .from(STORIES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);

  const { data: storyRow, error } = await supabase
    .from(STORIES_TABLE)
    .insert({
      run_id: runId,
      section: story.section,
      title: story.title,
      summary_html: story.summary_html,
      topic_tags: story.topic_tags,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !storyRow) throw new Error(error?.message ?? "Could not save the story.");

  const { error: sourceError } = await supabase.from(SOURCES_TABLE).insert(
    story.sources.map((source, index) => ({
      story_id: storyRow.id,
      url: source.url,
      title: source.title,
      accessed_at: new Date().toISOString(),
      published_at: source.published_at ?? null,
      snapshot_excerpt: source.excerpt,
      extracted_facts: source.extracted_facts ?? null,
      is_synthesis: source.is_synthesis,
      sort_order: index,
    }))
  );
  if (sourceError) throw new Error(sourceError.message);

  return { runId, storyId: storyRow.id as string };
}

export type CustomTopicResult = {
  runId: string;
  storyId: string;
  title: string;
  articleCount: number;
  claimChecks: BriefClaimCheck[];
  unreadableUrls: string[];
};

/** Research a brief, save the story to the Custom topics batch. Drafts are written by the existing generate endpoint. */
export async function createCustomTopic(options: {
  brief: string;
  section: ResearchSection;
  sourceUrls?: string[];
}): Promise<CustomTopicResult> {
  const { story, claimChecks, articleCount, unreadableUrls } = await researchCustomTopic(options);
  const { runId, storyId } = await saveCustomTopicStory(story);
  return { runId, storyId, title: story.title, articleCount, claimChecks, unreadableUrls };
}
