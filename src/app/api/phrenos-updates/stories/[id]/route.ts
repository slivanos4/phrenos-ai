import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  plainTextToSummaryHtml,
  requireAdminSession,
  sanitizeDashes,
  sanitizeSummaryText,
} from "@/lib/phrenos-updates";
import {
  PUBLISHED_POSTS_TABLE,
  STORIES_TABLE,
} from "@/lib/phrenos-updates/tables";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      summary_html?: string;
    };

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title != null) patch.title = sanitizeDashes(body.title);
    if (body.summary_html != null) {
      patch.summary_html = sanitizeSummaryText(body.summary_html);
    }

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: updated, error } = await supabase
      .from(STORIES_TABLE)
      .update(patch)
      .eq("id", id)
      .select("id, title, summary_html")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!updated) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Keep live posts in sync when the story summary changes.
    if (body.summary_html != null) {
      await supabase
        .from(PUBLISHED_POSTS_TABLE)
        .update({
          summary_html: plainTextToSummaryHtml(String(updated.summary_html ?? "")),
        })
        .eq("story_id", id);
    }

    return NextResponse.json({ ok: true, story: updated });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update story";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
