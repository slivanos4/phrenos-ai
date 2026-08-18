import { NextResponse } from "next/server";
import {
  AdminAuthError,
  createServiceRoleClient,
  errorResponse,
  requireAdminSession,
  sanitizeDashes,
} from "@/lib/phrenos-updates";
import { SUGGESTIONS_TABLE } from "@/lib/phrenos-updates/tables";

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

    if (body.title != null) patch.title = sanitizeDashes(body.title);
    if (body.hook != null) patch.hook = sanitizeDashes(body.hook);
    if (body.body_html != null) patch.body_html = sanitizeDashes(body.body_html);
    if (body.cta != null) patch.cta = sanitizeDashes(body.cta);
    if (body.hashtags != null) patch.hashtags = sanitizeDashes(body.hashtags);
    if (body.image_ideas != null) {
      patch.image_ideas = sanitizeDashes(body.image_ideas);
    }
    if (body.status) {
      patch.status = body.status;
      patch.approved_at =
        body.status === "approved" ? new Date().toISOString() : null;
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from(SUGGESTIONS_TABLE)
      .update(patch)
      .eq("id", id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
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
