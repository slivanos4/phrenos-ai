import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import {
  RUNS_TABLE,
  SOURCES_TABLE,
  STORIES_TABLE,
  SUGGESTIONS_TABLE,
} from "@/lib/phrenos-updates/tables";
import { resolveSourcePublishedDate } from "@/lib/phrenos-updates/source-dates";
import { sanitizeSummaryText } from "@/lib/phrenos-updates/sanitize";
import {
  generateStoryContentPack,
  storyHasIdeasPack,
} from "@/lib/phrenos-updates/story-content-pack";
import { cleanSourceExcerpt, isSocialMediaUrl } from "@/lib/phrenos-updates/source-text";
import {
  generateStorySummary,
  isLowQualitySummary,
  polishSummary,
} from "@/lib/phrenos-updates/story-summary";
import {
  cleanSuggestionFields,
  hasOffVoiceMarkers,
  isLowQualitySuggestionBody,
} from "@/lib/phrenos-updates/suggestion-quality";
import type {
  ContentSuggestion,
  GeneratedStory,
  GeneratedSuggestion,
  ResearchSection,
  SuggestionStatus,
  SuggestionType,
} from "@/lib/phrenos-updates/types";
import { runResearchAgent } from "@/lib/phrenos-updates/research-agent";

const STALE_RUN_MINUTES = 12;
const MAX_RESEARCH_ATTEMPTS = 3;

export type TriggerType = "cron" | "manual" | "retry";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lookbackWindow() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function lookbackKey(start: string, end: string) {
  return `${start}|${end}`;
}

function toContentSuggestion(
  storyId: string,
  item: GeneratedSuggestion,
  index: number,
  stored?: ContentSuggestion
): ContentSuggestion | null {
  const cleaned = cleanSuggestionFields(item);
  const isFullDraft = item.is_full_draft ?? false;
  const rejectBody = Boolean(
    cleaned?.body_html &&
      isFullDraft &&
      (isLowQualitySuggestionBody(cleaned.body_html) || hasOffVoiceMarkers(cleaned))
  );

  if (!cleaned || rejectBody) {
    if (stored?.body_html?.trim()) {
      return {
        id: stored.id,
        story_id: stored.story_id,
        suggestion_type: stored.suggestion_type as SuggestionType,
        status: (stored.status as SuggestionStatus) ?? "draft",
        title: stored.title ?? "",
        hook: stored.hook ?? "",
        body_html: stored.body_html ?? "",
        cta: stored.cta ?? "",
        hashtags: stored.hashtags ?? "",
        image_ideas: stored.image_ideas ?? "",
        sort_order: stored.sort_order ?? index,
        is_full_draft: stored.is_full_draft ?? isFullDraft,
      };
    }
    return null;
  }

  if (stored) {
    return {
      id: stored.id,
      story_id: stored.story_id,
      suggestion_type: stored.suggestion_type as SuggestionType,
      status: (stored.status as SuggestionStatus) ?? "draft",
      title: cleaned.title || stored.title,
      hook: cleaned.hook || stored.hook,
      body_html: cleaned.body_html || stored.body_html,
      cta: cleaned.cta || stored.cta,
      hashtags: cleaned.hashtags || stored.hashtags,
      image_ideas: cleaned.image_ideas || stored.image_ideas,
      sort_order: stored.sort_order ?? index,
      is_full_draft: stored.is_full_draft ?? isFullDraft,
    };
  }

  return {
    id: `ephemeral-${storyId}-${index}`,
    story_id: storyId,
    suggestion_type: cleaned.suggestion_type,
    status: "draft",
    title: cleaned.title,
    hook: cleaned.hook,
    body_html: cleaned.body_html,
    cta: cleaned.cta,
    hashtags: cleaned.hashtags,
    image_ideas: cleaned.image_ideas,
    sort_order: index,
    is_full_draft: isFullDraft,
  };
}

/** Drop stuck or superseded runs so the week picker stays one batch per window. */
export async function cleanupAbandonedRuns() {
  const supabase = createServiceRoleClient();
  const staleCutoff = Date.now() - STALE_RUN_MINUTES * 60 * 1000;

  const { data: runs, error } = await supabase
    .from(RUNS_TABLE)
    .select("id, status, lookback_start, lookback_end, started_at, created_at")
    .order("created_at", { ascending: false });

  if (error || !runs?.length) return;

  for (const run of runs) {
    if (run.status !== "running" || !run.started_at) continue;
    if (new Date(run.started_at).getTime() > staleCutoff) continue;

    await supabase
      .from(RUNS_TABLE)
      .update({
        status: "failed",
        error_message: `Research timed out after ${STALE_RUN_MINUTES} minutes. Re-run this week to try again.`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    run.status = "failed";
  }

  const byWindow = new Map<string, { completedIds: string[]; discardIds: string[] }>();

  for (const run of runs) {
    if (!run.lookback_start || !run.lookback_end) continue;
    const key = lookbackKey(run.lookback_start, run.lookback_end);
    const entry = byWindow.get(key) ?? { completedIds: [], discardIds: [] };

    if (run.status === "completed") {
      entry.completedIds.push(run.id);
    } else if (["running", "pending", "failed"].includes(run.status)) {
      entry.discardIds.push(run.id);
    }

    byWindow.set(key, entry);
  }

  const idsToDelete: string[] = [];
  for (const entry of byWindow.values()) {
    if (entry.completedIds.length === 0) continue;
    idsToDelete.push(...entry.discardIds);
  }

  if (idsToDelete.length > 0) {
    await supabase.from(RUNS_TABLE).delete().in("id", idsToDelete);
  }
}

export async function listResearchRuns(limit = 20) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(RUNS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteResearchRun(runId: string) {
  const supabase = createServiceRoleClient();

  const { data: run, error } = await supabase
    .from(RUNS_TABLE)
    .select("id, status")
    .eq("id", runId)
    .maybeSingle();

  if (error || !run) {
    throw new Error(error?.message ?? "Run not found.");
  }

  if (run.status === "completed") {
    throw new Error(
      "Completed batches cannot be deleted. Use Re-run this week to refresh content."
    );
  }

  const { error: deleteError } = await supabase.from(RUNS_TABLE).delete().eq("id", runId);
  if (deleteError) throw new Error(deleteError.message);
}

async function persistStorySuggestions(storyId: string, suggestions: GeneratedSuggestion[]) {
  const supabase = createServiceRoleClient();
  await supabase.from(SUGGESTIONS_TABLE).delete().eq("story_id", storyId);

  if (suggestions.length === 0) return;

  const { error } = await supabase.from(SUGGESTIONS_TABLE).insert(
    suggestions.map((suggestion, index) => ({
      story_id: storyId,
      suggestion_type: suggestion.suggestion_type,
      status: "draft",
      title: suggestion.title,
      hook: suggestion.hook,
      body_html: suggestion.body_html,
      cta: suggestion.cta,
      hashtags: suggestion.hashtags,
      image_ideas: suggestion.image_ideas,
      sort_order: index,
      is_full_draft: suggestion.is_full_draft ?? false,
    }))
  );

  if (error) throw new Error(error.message);
}

export async function createPendingResearchRun(options: {
  triggerType: TriggerType;
  createdBy?: string | null;
}) {
  const supabase = createServiceRoleClient();
  const window = lookbackWindow();

  await cleanupAbandonedRuns();

  const { data: completedRun } = await supabase
    .from(RUNS_TABLE)
    .select("id")
    .eq("lookback_start", window.start)
    .eq("lookback_end", window.end)
    .eq("status", "completed")
    .maybeSingle();

  if (completedRun && options.triggerType === "manual") {
    throw new Error(
      "A batch for this week already exists. Open it from Week to review and use Re-run this week."
    );
  }

  await supabase
    .from(RUNS_TABLE)
    .delete()
    .eq("lookback_start", window.start)
    .eq("lookback_end", window.end)
    .in("status", ["running", "pending", "failed"]);

  const { data: run, error } = await supabase
    .from(RUNS_TABLE)
    .insert({
      status: "running",
      trigger_type: options.triggerType,
      lookback_start: window.start,
      lookback_end: window.end,
      started_at: new Date().toISOString(),
      created_by: options.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !run) throw new Error(error?.message ?? "Could not create research run.");
  return run.id as string;
}

export async function executeResearchRun(options: {
  triggerType: TriggerType;
  createdBy?: string | null;
  existingRunId?: string;
}) {
  const supabase = createServiceRoleClient();
  const window = lookbackWindow();

  let runId = options.existingRunId;
  let attempt = 0;

  if (!runId) {
    const { data: run, error } = await supabase
      .from(RUNS_TABLE)
      .insert({
        status: "running",
        trigger_type: options.triggerType,
        lookback_start: window.start,
        lookback_end: window.end,
        started_at: new Date().toISOString(),
        created_by: options.createdBy ?? null,
      })
      .select("id")
      .single();

    if (error || !run) throw new Error(error?.message ?? "Could not create research run.");
    runId = run.id as string;
  }

  const activeRunId = runId;

  while (attempt < MAX_RESEARCH_ATTEMPTS) {
    attempt += 1;

    await supabase
      .from(RUNS_TABLE)
      .update({
        status: "running",
        trigger_type: options.triggerType,
        lookback_start: window.start,
        lookback_end: window.end,
        started_at: new Date().toISOString(),
        error_message: null,
        retry_count: attempt - 1,
      })
      .eq("id", activeRunId);

    await supabase.from(STORIES_TABLE).delete().eq("run_id", activeRunId);

    try {
      const storyRows = await runResearchAgent({
        lookbackStart: window.start,
        lookbackEnd: window.end,
      });

      for (const [storyIndex, story] of storyRows.entries()) {
        const { data: storyRow, error: storyError } = await supabase
          .from(STORIES_TABLE)
          .insert({
            run_id: activeRunId,
            section: story.section,
            title: story.title,
            summary_html: story.summary_html,
            topic_tags: story.topic_tags,
            sort_order: storyIndex,
          })
          .select("id")
          .single();

        if (storyError || !storyRow) continue;

        if (story.sources.length > 0) {
          await supabase.from(SOURCES_TABLE).insert(
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
        }
      }

      await supabase
        .from(RUNS_TABLE)
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          retry_count: attempt - 1,
          error_message: null,
        })
        .eq("id", activeRunId);

      return activeRunId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research run failed.";
      const nonRetryable =
        /credit balance|invalid x-api-key|authentication/i.test(message) ||
        message.includes("ANTHROPIC_API_KEY") ||
        message.includes("TAVILY_API_KEY");

      if (nonRetryable || attempt >= MAX_RESEARCH_ATTEMPTS) {
        await supabase
          .from(RUNS_TABLE)
          .update({
            status: "failed",
            error_message: message,
            retry_count: attempt,
            completed_at: new Date().toISOString(),
          })
          .eq("id", activeRunId);

        throw error;
      }
    }
  }

  throw new Error("Research run failed after retries.");
}

/** Regenerate missing content packs for an existing batch (no new Tavily fetch). */
export async function repairRunDrafts(runId: string, options?: { maxStories?: number }) {
  const maxStories = options?.maxStories ?? 1;
  const supabase = createServiceRoleClient();

  const { data: run } = await supabase.from(RUNS_TABLE).select("*").eq("id", runId).maybeSingle();

  if (!run || !["completed", "failed"].includes(run.status)) {
    throw new Error("Content generation is only available for saved weekly batches.");
  }

  const { data: stories } = await supabase
    .from(STORIES_TABLE)
    .select("*")
    .eq("run_id", runId)
    .order("sort_order");

  if (!stories?.length) {
    throw new Error("No stories found for this batch.");
  }

  const storyIds = stories.map((story) => story.id);
  const { data: sources } = await supabase
    .from(SOURCES_TABLE)
    .select("*")
    .in("story_id", storyIds);

  const { data: existingSuggestions } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("*")
    .in("story_id", storyIds);

  const storiesWithIdeasPack = new Set<string>();
  for (const storyRow of stories) {
    const rows = (existingSuggestions ?? []).filter((row) => row.story_id === storyRow.id);
    const packStory: GeneratedStory = {
      section: storyRow.section as ResearchSection,
      title: storyRow.title,
      summary_html: storyRow.summary_html ?? "",
      topic_tags: (storyRow.topic_tags as string[]) ?? [],
      sources: [],
      suggestions: rows.map((row) => ({
        suggestion_type: row.suggestion_type as SuggestionType,
        title: row.title ?? "",
        hook: row.hook ?? "",
        body_html: row.body_html ?? "",
        cta: row.cta ?? "",
        hashtags: row.hashtags ?? "",
        image_ideas: row.image_ideas ?? "",
        is_full_draft: Boolean(row.is_full_draft),
      })),
    };
    if (storyHasIdeasPack(packStory)) {
      storiesWithIdeasPack.add(storyRow.id);
    }
  }

  let repaired = storiesWithIdeasPack.size;
  let processed = 0;
  let lastError: string | null = null;
  let processingStoryTitle: string | null = null;

  for (const storyRow of stories) {
    if (storiesWithIdeasPack.has(storyRow.id)) continue;
    if (processed >= maxStories) break;

    processingStoryTitle = storyRow.title;

    const generatedStory: GeneratedStory = {
      section: storyRow.section as ResearchSection,
      title: storyRow.title,
      summary_html: storyRow.summary_html ?? "",
      topic_tags: (storyRow.topic_tags as string[]) ?? [],
      sources: (sources ?? [])
        .filter((source) => source.story_id === storyRow.id)
        .filter((source) => !isSocialMediaUrl(source.url ?? ""))
        .map((source) => ({
          url: source.url ?? "",
          title: source.title ?? "",
          excerpt: cleanSourceExcerpt(source.snapshot_excerpt ?? "") ?? "",
          is_synthesis: source.is_synthesis,
          published_at: source.published_at as string | null | undefined,
          extracted_facts: source.extracted_facts ?? null,
        })),
      suggestions: [],
    };

    const suggestions = await generateStoryContentPack(generatedStory);
    const withSuggestions = { ...generatedStory, suggestions };

    if (suggestions.length > 0) {
      try {
        await persistStorySuggestions(storyRow.id, suggestions);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save content.";
        lastError = message.includes("is_full_draft")
          ? `${message} Apply supabase/migrations/001_phrenos_updates.sql, then try again.`
          : message;
        console.error(lastError);
        processed += 1;
        continue;
      }
    }

    if (storyHasIdeasPack(withSuggestions)) {
      repaired += 1;
    } else {
      lastError = `Could not generate enough post ideas for "${storyRow.title}" (${suggestions.length} saved).`;
      console.error(lastError);
    }

    processed += 1;
  }

  const remaining = stories.length - repaired;

  await supabase
    .from(RUNS_TABLE)
    .update({
      status: "completed",
      error_message: null,
      completed_at: run.completed_at ?? new Date().toISOString(),
    })
    .eq("id", runId);

  if (remaining > 0 && repaired === 0) {
    throw new Error(
      lastError ??
        `Content generation incomplete: ${repaired} of ${stories.length} stories have a full pack. Click Generate content again or re-run this week.`
    );
  }

  return {
    repaired,
    total: stories.length,
    remaining: Math.max(remaining, 0),
    complete: remaining <= 0,
    processingStoryTitle: remaining > 0 ? processingStoryTitle : null,
  };
}

async function normalizeDraftFailedRun(
  runId: string,
  run: { status: string; error_message: string | null; completed_at: string | null }
) {
  if (run.status !== "failed" || !run.error_message) return run;

  const isDraftFailure =
    run.error_message.includes("Content generation incomplete") ||
    run.error_message.includes("Draft generation incomplete");

  if (!isDraftFailure) return run;

  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from(STORIES_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId);

  if (!count) return run;

  await supabase
    .from(RUNS_TABLE)
    .update({
      status: "completed",
      error_message: null,
      completed_at: run.completed_at ?? new Date().toISOString(),
    })
    .eq("id", runId);

  return { ...run, status: "completed", error_message: null };
}

export async function loadRunWithDetails(runId: string) {
  const supabase = createServiceRoleClient();

  const { data: run } = await supabase.from(RUNS_TABLE).select("*").eq("id", runId).maybeSingle();
  if (!run) return null;

  Object.assign(run, await normalizeDraftFailedRun(runId, run));

  if (run.status === "running" && run.started_at) {
    const startedMs = new Date(run.started_at).getTime();
    if (Date.now() - startedMs > STALE_RUN_MINUTES * 60 * 1000) {
      const message = `Research timed out after ${STALE_RUN_MINUTES} minutes. Re-run this week to try again.`;
      await supabase
        .from(RUNS_TABLE)
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      run.status = "failed";
      run.error_message = message;
    }
  }

  const { data: stories } = await supabase
    .from(STORIES_TABLE)
    .select("*")
    .eq("run_id", runId)
    .order("sort_order");

  const storyIds = (stories ?? []).map((story) => story.id);
  const { data: sources } = storyIds.length
    ? await supabase.from(SOURCES_TABLE).select("*").in("story_id", storyIds)
    : { data: [] };
  const { data: suggestions } = storyIds.length
    ? await supabase.from(SUGGESTIONS_TABLE).select("*").in("story_id", storyIds)
    : { data: [] };

  const enrichedStories = await Promise.all(
    (stories ?? []).map(async (story) => {
      const storySources = (sources ?? [])
        .filter((source) => source.story_id === story.id)
        .filter((source) => !isSocialMediaUrl(source.url ?? ""))
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
        .map((source) => ({
          ...source,
          snapshot_excerpt: cleanSourceExcerpt(source.snapshot_excerpt ?? "") || null,
          published_at: resolveSourcePublishedDate(
            source.url,
            source.published_at as string | null | undefined,
            source.published_at as string | null | undefined,
            `${source.title ?? ""} ${source.snapshot_excerpt ?? ""}`
          ),
        }));

      const storedRows = (suggestions ?? [])
        .filter((suggestion) => suggestion.story_id === story.id)
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
        .map((suggestion) => suggestion as ContentSuggestion);

      // Keep each cleaned suggestion paired with its stored row so ids and status survive.
      const cleanedPairs = storedRows
        .map((row) => ({
          row,
          cleaned: cleanSuggestionFields({
            suggestion_type: row.suggestion_type as SuggestionType,
            title: row.title ?? "",
            hook: row.hook ?? "",
            body_html: row.body_html ?? "",
            cta: row.cta ?? "",
            hashtags: row.hashtags ?? "",
            image_ideas: row.image_ideas ?? "",
            is_full_draft: row.is_full_draft ?? false,
          }),
        }))
        .filter(
          (pair): pair is { row: ContentSuggestion; cleaned: GeneratedSuggestion } =>
            pair.cleaned !== null
        );

      const summarySources = storySources.map((source) => ({
        excerpt: source.snapshot_excerpt ?? "",
        extracted_facts: source.extracted_facts ?? null,
        is_synthesis: source.is_synthesis,
        title: source.title ?? "",
      }));

      const generatedStoryForSummary: GeneratedStory = {
        section: story.section as ResearchSection,
        title: story.title,
        summary_html: story.summary_html ?? "",
        topic_tags: (story.topic_tags as string[]) ?? [],
        sources: storySources.map((source) => ({
          url: source.url,
          title: source.title ?? "",
          excerpt: source.snapshot_excerpt ?? "",
          is_synthesis: source.is_synthesis,
          published_at: source.published_at as string | null | undefined,
          extracted_facts: source.extracted_facts ?? null,
        })),
        suggestions: [],
      };

      let summaryHtml = sanitizeSummaryText(
        polishSummary(story.title, story.summary_html ?? "", summarySources)
      );

      if (isLowQualitySummary(summaryHtml, story.title) && process.env.ANTHROPIC_API_KEY) {
        const regenerated = await generateStorySummary(generatedStoryForSummary);
        if (regenerated && !isLowQualitySummary(regenerated, story.title)) {
          summaryHtml = sanitizeSummaryText(regenerated);
          await supabase
            .from(STORIES_TABLE)
            .update({ summary_html: summaryHtml })
            .eq("id", story.id);
        }
      }

      const storySuggestions = cleanedPairs
        .map((pair, index) => toContentSuggestion(story.id, pair.cleaned, index, pair.row))
        .filter((suggestion): suggestion is ContentSuggestion => suggestion !== null);

      return {
        ...story,
        summary_html: summaryHtml,
        sources: storySources,
        suggestions: storySuggestions,
      };
    })
  );

  return { ...run, stories: enrichedStories };
}

/** Load one story with its sources, shaped for content generation calls. */
export async function loadStoryForContent(storyId: string): Promise<GeneratedStory | null> {
  const supabase = createServiceRoleClient();

  const { data: story } = await supabase
    .from(STORIES_TABLE)
    .select("*")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return null;

  const { data: sources } = await supabase
    .from(SOURCES_TABLE)
    .select("*")
    .eq("story_id", storyId)
    .order("sort_order");

  return {
    section: story.section as ResearchSection,
    title: story.title,
    summary_html: story.summary_html ?? "",
    topic_tags: (story.topic_tags as string[]) ?? [],
    sources: (sources ?? [])
      .filter((source) => !isSocialMediaUrl(source.url ?? ""))
      .map((source) => ({
        url: source.url ?? "",
        title: source.title ?? "",
        excerpt: cleanSourceExcerpt(source.snapshot_excerpt ?? "") ?? "",
        is_synthesis: source.is_synthesis,
        published_at: source.published_at as string | null | undefined,
        extracted_facts: source.extracted_facts ?? null,
      })),
    suggestions: [],
  };
}
