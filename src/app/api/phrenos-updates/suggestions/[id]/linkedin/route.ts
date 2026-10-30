import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  generateLinkedinFromArticle,
  loadStoryForContent,
  requireAdminSession,
  sanitizeEditorialText,
} from "@/lib/phrenos-updates";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";

export const maxDuration = 300;

/** Writes a new LinkedIn draft from a finished blog article. Existing LinkedIn drafts are left untouched. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    const { data: article, error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    if (article.suggestion_type !== "blog" || !article.is_full_draft) {
      return NextResponse.json(
        { error: "A LinkedIn post can only be written from a full blog article." },
        { status: 400 },
      );
    }

    const story = await loadStoryForContent(article.story_id as string);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const result = await generateLinkedinFromArticle(story, {
      suggestion_type: "blog",
      title: article.title,
      hook: article.hook,
      body_html: article.body_html,
      cta: article.cta,
      hashtags: article.hashtags,
      image_ideas: article.image_ideas,
      is_full_draft: true,
    });

    if (!result.draft) {
      console.error(
        `LinkedIn from article failed for suggestion ${id} ("${story.title}"): ${result.reason}`,
      );
      return NextResponse.json(
        { error: `Could not write a LinkedIn post from this article: ${result.reason}` },
        { status: 422 },
      );
    }

    const draft = result.draft;

    const { data: inserted, error: insertError } = await supabase
      .from(SUGGESTIONS_TABLE)
      .insert({
        story_id: article.story_id,
        suggestion_type: "linkedin",
        title: sanitizeEditorialText(draft.title),
        hook: sanitizeEditorialText(draft.hook),
        body_html: sanitizeEditorialText(draft.body_html),
        cta: sanitizeEditorialText(draft.cta),
        hashtags: sanitizeEditorialText(draft.hashtags),
        image_ideas: sanitizeEditorialText(draft.image_ideas),
        is_full_draft: true,
        status: "draft",
        sort_order: 100,
      })
      .select("*")
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ suggestion: inserted });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to write LinkedIn post";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
