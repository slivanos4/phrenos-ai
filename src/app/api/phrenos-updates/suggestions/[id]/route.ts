import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  normalizePresentationHtml,
  requireAdminSession,
  sanitizeEditorialText,
} from "@/lib/phrenos-updates";
import {
  PUBLISHED_POSTS_TABLE,
  SUGGESTIONS_TABLE,
} from "@/lib/phrenos-updates/tables";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      hook?: string;
      body_html?: string;
      cta?: string;
      hashtags?: string;
      image_ideas?: string;
      status?: "draft" | "approved" | "rejected";
    };

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title != null) patch.title = sanitizeEditorialText(body.title);
    if (body.hook != null) patch.hook = sanitizeEditorialText(body.hook);
    if (body.body_html != null) {
      patch.body_html = normalizePresentationHtml(
        sanitizeEditorialText(body.body_html)
      );
    }
    if (body.cta != null) patch.cta = sanitizeEditorialText(body.cta);
    if (body.hashtags != null) {
      patch.hashtags = sanitizeEditorialText(body.hashtags);
    }
    if (body.image_ideas != null) {
      patch.image_ideas = sanitizeEditorialText(body.image_ideas);
    }
    if (body.status) {
      patch.status = body.status;
      patch.approved_at =
        body.status === "approved" ? new Date().toISOString() : null;
    }

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: updated, error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .update(patch)
      .eq("id", id)
      .select(
        "id, status, title, hook, body_html, cta, hashtags, image_ideas, is_full_draft, suggestion_type"
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!updated) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }

    // If this draft is already live, push content edits to the published post.
    const contentTouched =
      body.title != null ||
      body.hook != null ||
      body.body_html != null ||
      body.cta != null;

    if (contentTouched && updated.status === "published") {
      const livePatch: Record<string, unknown> = {};
      if (body.title != null) livePatch.title = updated.title;
      if (body.hook != null) livePatch.hook = updated.hook;
      if (body.body_html != null) livePatch.body_html = updated.body_html;
      if (body.cta != null) livePatch.cta = updated.cta;

      if (Object.keys(livePatch).length > 0) {
        const { error: liveError } = await supabase
          .from(PUBLISHED_POSTS_TABLE)
          .update(livePatch)
          .eq("suggestion_id", id);
        if (liveError) throw new Error(liveError.message);
      }
    }

    return NextResponse.json({ ok: true, suggestion: updated });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update suggestion";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
