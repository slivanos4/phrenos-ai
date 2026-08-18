import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  publishSuggestionToSite,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const result = await publishSuggestionToSite(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to publish";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
