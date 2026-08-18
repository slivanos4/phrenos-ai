import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  repairRunDrafts,
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
      maxStories?: number;
    };

    const result = await repairRunDrafts(id, {
      maxStories: body.maxStories ?? 1,
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
