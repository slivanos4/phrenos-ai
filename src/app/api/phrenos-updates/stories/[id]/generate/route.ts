import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  generateContentForStory,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "full" | "hero-blog";
    };
    const result = await generateContentForStory(id, {
      mode: body.mode === "hero-blog" ? "hero-blog" : "full",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
