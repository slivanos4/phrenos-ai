import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  generateWeekHeroContent,
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
    const result = await generateWeekHeroContent(id);

    if (!result.drafted) {
      return NextResponse.json(
        {
          error:
            result.error ??
            "Could not draft this week's featured blog and LinkedIn pack. Try again in a moment.",
          ...result,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to draft week hero";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
