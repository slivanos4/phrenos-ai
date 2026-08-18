import { after, NextResponse } from "next/server";
import {
  AdminAuthError,
  errorResponse,
  executeResearchRun,
  isServiceRoleConfigured,
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

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required for research runs." },
        { status: 503 },
      );
    }

    after(async () => {
      try {
        await executeResearchRun({
          triggerType: "retry",
          existingRunId: id,
        });
      } catch (error) {
        console.error("Background re-run failed:", error);
      }
    });

    return NextResponse.json({
      run: { id, status: "pending" },
      message:
        "Re-run started. After research, the week's strongest story will get a new featured blog draft.",
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to re-run";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
