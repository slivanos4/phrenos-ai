import { after, NextResponse } from "next/server";
import {
  AdminAuthError,
  assertRunIsRerunnable,
  errorResponse,
  executeResearchRun,
  isServiceRoleConfigured,
  requireAdminSession,
} from "@/lib/phrenos-updates";

// Research plus the week's hero draft took about 4m50s on a good week, right at the old 300s limit. The Pro plan allows up to 800s.
export const maxDuration = 800;

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

    await assertRunIsRerunnable(id);

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
        "Re-run started. After research, the week's strongest story will get a new featured blog and LinkedIn pack.",
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
