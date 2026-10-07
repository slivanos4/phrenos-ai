import { NextResponse } from "next/server";
import { AdminAuthError, errorResponse, requireAdminSession } from "@/lib/phrenos-updates";
import { reviewAndImproveSuggestion } from "@/lib/phrenos-updates/draft-review";

export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    return NextResponse.json(await reviewAndImproveSuggestion(id));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to proofread draft";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
