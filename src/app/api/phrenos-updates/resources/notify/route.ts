import { NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  notifySubscribersOfNewResource,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      url?: string;
    };

    const title = body.title?.trim();
    const url = body.url?.trim();

    if (!title || !url) {
      return NextResponse.json(
        { error: "title and url are required." },
        { status: 400 },
      );
    }

    const result = await notifySubscribersOfNewResource({
      title,
      description: body.description?.trim(),
      url,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to notify subscribers";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
