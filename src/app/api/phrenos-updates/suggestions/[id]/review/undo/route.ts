import { NextResponse } from "next/server";
import { AdminAuthError, errorResponse, requireAdminSession } from "@/lib/phrenos-updates";
import { undoReviewReport } from "@/lib/phrenos-updates/draft-review";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    await undoReviewReport(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to undo the proofread";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
