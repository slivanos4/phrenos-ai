import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  generateFullDraftFromIdea,
  loadStoryForContent,
  requireAdminSession,
  sanitizeDashes,
} from "@/lib/phrenos-updates";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";

export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const supabase = createServiceRoleClient();

    const { data: idea, error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !idea) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }

    const story = await loadStoryForContent(idea.story_id as string);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const draft = await generateFullDraftFromIdea(story, {
      suggestion_type: idea.suggestion_type,
      title: idea.title,
      hook: idea.hook,
      body_html: idea.body_html,
      cta: idea.cta,
      hashtags: idea.hashtags,
      image_ideas: idea.image_ideas,
      is_full_draft: false,
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Could not expand this idea into a full draft." },
        { status: 422 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from(SUGGESTIONS_TABLE)
      .insert({
        story_id: idea.story_id,
        suggestion_type: draft.suggestion_type,
        title: sanitizeDashes(draft.title),
        hook: sanitizeDashes(draft.hook),
        body_html: sanitizeDashes(draft.body_html),
        cta: sanitizeDashes(draft.cta),
        hashtags: sanitizeDashes(draft.hashtags),
        image_ideas: sanitizeDashes(draft.image_ideas),
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
      error instanceof Error ? error.message : "Failed to expand idea";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
