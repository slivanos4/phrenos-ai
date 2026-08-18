import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  publishApprovedToSite,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const body = (await request.json()) as { runId?: string };
    if (!body.runId) {
      return NextResponse.json({ error: "runId is required." }, { status: 400 });
    }

    const result = await publishApprovedToSite(body.runId);
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
