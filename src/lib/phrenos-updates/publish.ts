import { createServiceRoleClient } from "@/lib/phrenos-updates/supabase";
import {
  PUBLISHED_POSTS_TABLE,
  STORIES_TABLE,
  SUGGESTIONS_TABLE,
} from "@/lib/phrenos-updates/tables";
import {
  normalizePresentationHtml,
  plainTextToSummaryHtml,
  sanitizeDashes,
  slugify,
} from "@/lib/phrenos-updates/sanitize";
import type { PublishedPost } from "@/lib/phrenos-updates/types";

export type PublishResult = {
  published: number;
  skipped: number;
  posts: { id: string; title: string; slug: string }[];
};

async function uniqueSlug(
  supabase: ReturnType<typeof createServiceRoleClient>,
  title: string,
  fallbackSeed: string
): Promise<string> {
  const base = slugify(title) || `ai-update-${fallbackSeed.slice(0, 8)}`;

  const { data: existing } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("slug")
    .like("slug", `${base}%`);

  const taken = new Set((existing ?? []).map((row) => row.slug as string));
  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 50; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Publish one approved featured blog draft to the public /ai-updates feed.
 * Ideas and LinkedIn drafts are never published here.
 */
export async function publishSuggestionToSite(suggestionId: string): Promise<PublishResult> {
  const supabase = createServiceRoleClient();

  const { data: suggestion, error } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!suggestion) throw new Error("Draft not found.");

  if (suggestion.suggestion_type !== "blog" || !suggestion.is_full_draft) {
    throw new Error("Only featured blog drafts can be published to /ai-updates.");
  }

  if (suggestion.status === "published") {
    const { data: existing } = await supabase
      .from(PUBLISHED_POSTS_TABLE)
      .select("id, title, slug")
      .eq("suggestion_id", suggestionId)
      .maybeSingle();

    if (existing) {
      return {
        published: 0,
        skipped: 1,
        posts: [
          {
            id: existing.id as string,
            title: existing.title as string,
            slug: existing.slug as string,
          },
        ],
      };
    }
  }

  if (suggestion.status !== "approved" && suggestion.status !== "published") {
    throw new Error("Approve this blog draft before publishing.");
  }

  const { data: alreadyPublished } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("id, title, slug")
    .eq("suggestion_id", suggestionId)
    .maybeSingle();

  if (alreadyPublished) {
    await supabase
      .from(SUGGESTIONS_TABLE)
      .update({ status: "published" })
      .eq("id", suggestionId);

    return {
      published: 0,
      skipped: 1,
      posts: [
        {
          id: alreadyPublished.id as string,
          title: alreadyPublished.title as string,
          slug: alreadyPublished.slug as string,
        },
      ],
    };
  }

  const { data: story } = await supabase
    .from(STORIES_TABLE)
    .select("id, title, summary_html")
    .eq("id", suggestion.story_id)
    .maybeSingle();

  const title = sanitizeDashes(
    String(suggestion.title || story?.title || "Phrenos AI update")
  );
  const slug = await uniqueSlug(supabase, title, String(suggestion.id));

  const { data: inserted, error: insertError } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .insert({
      suggestion_id: suggestion.id,
      story_id: suggestion.story_id,
      title,
      slug,
      hook: sanitizeDashes(String(suggestion.hook ?? "")),
      summary_html: plainTextToSummaryHtml(String(story?.summary_html ?? "")),
      body_html: normalizePresentationHtml(String(suggestion.body_html ?? "")),
      cta: sanitizeDashes(String(suggestion.cta ?? "")),
      published_at: new Date().toISOString(),
    })
    .select("id, title, slug")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Could not publish this draft.");
  }

  await supabase
    .from(SUGGESTIONS_TABLE)
    .update({ status: "published" })
    .eq("id", suggestion.id);

  return {
    published: 1,
    skipped: 0,
    posts: [
      {
        id: inserted.id as string,
        title: inserted.title as string,
        slug: inserted.slug as string,
      },
    ],
  };
}

/**
 * Publish all approved featured blogs from one run to /ai-updates.
 * Prefer publishSuggestionToSite when publishing one piece at a time.
 */
export async function publishApprovedToSite(runId: string): Promise<PublishResult> {
  const supabase = createServiceRoleClient();

  const { data: stories, error: storiesError } = await supabase
    .from(STORIES_TABLE)
    .select("id")
    .eq("run_id", runId)
    .order("sort_order");

  if (storiesError) throw new Error(storiesError.message);
  if (!stories?.length) throw new Error("No stories found for this batch.");

  const storyIds = stories.map((story) => story.id as string);

  const { data: approved, error: suggestionsError } = await supabase
    .from(SUGGESTIONS_TABLE)
    .select("id")
    .in("story_id", storyIds)
    .eq("suggestion_type", "blog")
    .eq("is_full_draft", true)
    .eq("status", "approved")
    .order("sort_order");

  if (suggestionsError) throw new Error(suggestionsError.message);

  if (!approved?.length) {
    return { published: 0, skipped: 0, posts: [] };
  }

  const posts: PublishResult["posts"] = [];
  let published = 0;
  let skipped = 0;

  for (const row of approved) {
    try {
      const result = await publishSuggestionToSite(row.id as string);
      published += result.published;
      skipped += result.skipped;
      posts.push(...result.posts);
    } catch (error) {
      console.error(`Could not publish suggestion ${row.id}:`, error);
      skipped += 1;
    }
  }

  return { published, skipped, posts };
}

/** Public feed for /ai-updates. Server side only: reads through the service role. */
export async function listPublishedPosts(limit = 24): Promise<PublishedPost[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as PublishedPost[];
}

export async function getPublishedPostBySlug(slug: string): Promise<PublishedPost | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PublishedPost | null) ?? null;
}

export async function unpublishPost(postId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: post } = await supabase
    .from(PUBLISHED_POSTS_TABLE)
    .select("suggestion_id")
    .eq("id", postId)
    .maybeSingle();

  const { error } = await supabase.from(PUBLISHED_POSTS_TABLE).delete().eq("id", postId);
  if (error) throw new Error(error.message);

  if (post?.suggestion_id) {
    await supabase
      .from(SUGGESTIONS_TABLE)
      .update({ status: "approved" })
      .eq("id", post.suggestion_id);
  }
}
