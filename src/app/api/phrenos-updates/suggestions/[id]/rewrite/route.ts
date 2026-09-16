import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  loadStoryForContent,
  requireAdminSession,
  rewriteDraftField,
  rewriteDraftParagraph,
  rewriteWholeDraft,
} from "@/lib/phrenos-updates";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";

export const maxDuration = 300;

const SCOPES = ["all", "title", "hook", "cta", "body", "paragraph"] as const;
type Scope = (typeof SCOPES)[number];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      scope?: Scope;
      instruction?: string;
      title?: string;
      hook?: string;
      body_html?: string;
      cta?: string;
      paragraphHtml?: string;
    };

    const scope: Scope = body.scope && SCOPES.includes(body.scope) ? body.scope : "all";

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

    if (scope === "all") {
      const result = await rewriteWholeDraft(story, current, body.instruction);
      if (!result.draft) {
        console.error(
          `Rewrite (all) failed for suggestion ${id} ("${story.title}"): ${result.reason}`,
        );
        return NextResponse.json({ error: result.reason }, { status: 422 });
      }
      return NextResponse.json({
        title: result.draft.title,
        hook: result.draft.hook,
        body_html: result.draft.body_html,
        cta: result.draft.cta,
        hashtags: result.draft.hashtags,
        image_ideas: result.draft.image_ideas,
      });
    }

    if (scope === "paragraph") {
      if (!body.paragraphHtml?.trim()) {
        return NextResponse.json({ error: "paragraphHtml is required." }, { status: 400 });
      }
      const result = await rewriteDraftParagraph(story, current, body.paragraphHtml, body.instruction);
      if (!result.value) {
        console.error(
          `Rewrite (paragraph) failed for suggestion ${id} ("${story.title}"): ${result.reason}`,
        );
        return NextResponse.json({ error: result.reason }, { status: 422 });
      }
      return NextResponse.json({ paragraphHtml: result.value });
    }

    const result = await rewriteDraftField(story, current, scope, body.instruction);
    if (!result.value) {
      console.error(
        `Rewrite (${scope}) failed for suggestion ${id} ("${story.title}"): ${result.reason}`,
      );
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    const key = scope === "body" ? "body_html" : scope;
    return NextResponse.json({ [key]: result.value });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to rewrite draft";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
