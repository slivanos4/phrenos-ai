import { after, NextResponse } from "next/server";
import {
  AdminAuthError,
  cleanupAbandonedRuns,
  createPendingResearchRun,
  errorResponse,
  executeResearchRun,
  isServiceRoleConfigured,
  listResearchRuns,
  requireAdminSession,
} from "@/lib/phrenos-updates";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    if (isServiceRoleConfigured()) {
      await cleanupAbandonedRuns();
    }
    const runs = await listResearchRuns(20);
    return NextResponse.json({ runs });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to list runs";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required for research runs." },
        { status: 503 },
      );
    }

    const runId = await createPendingResearchRun({ triggerType: "manual" });

    after(async () => {
      try {
        await executeResearchRun({
          triggerType: "manual",
          existingRunId: runId,
        });
      } catch (error) {
        console.error("Background research run failed:", error);
      }
    });

    return NextResponse.json({
      run: { id: runId, status: "pending" },
      message:
        "Research started. When it finishes, the week's strongest story will get an automatic featured blog draft.",
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to start research";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
