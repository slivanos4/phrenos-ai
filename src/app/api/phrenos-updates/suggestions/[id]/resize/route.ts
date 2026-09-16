import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  loadStoryForContent,
  requireAdminSession,
  resizeSuggestionDraft,
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
    const body = (await request.json().catch(() => ({}))) as {
      direction?: "shorter" | "longer";
      title?: string;
      hook?: string;
      body_html?: string;
      cta?: string;
    };

    if (body.direction !== "shorter" && body.direction !== "longer") {
      return NextResponse.json(
        { error: 'direction must be "shorter" or "longer".' },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const { data: existing, error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !existing) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }

    const story = await loadStoryForContent(existing.story_id as string);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const current = {
      suggestion_type: existing.suggestion_type,
      title: body.title ?? existing.title,
      hook: body.hook ?? existing.hook,
      body_html: body.body_html ?? existing.body_html,
      cta: body.cta ?? existing.cta,
      hashtags: existing.hashtags,
      image_ideas: existing.image_ideas,
      is_full_draft: true,
    };

    const result = await resizeSuggestionDraft(story, current, body.direction);
    if (!result.body_html) {
      console.error(
        `Resize (${body.direction}) failed for suggestion ${id} ("${story.title}"): ${result.reason}`,
      );
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    return NextResponse.json({ body_html: result.body_html, cta: result.cta });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to resize draft";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
