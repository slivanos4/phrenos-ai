import { NextResponse } from "next/server";
import {
  AdminAuthError,
  deleteResearchRun,
  errorResponse,
  loadRunWithDetails,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const run = await loadRunWithDetails(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load run";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    await deleteResearchRun(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to delete run";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
