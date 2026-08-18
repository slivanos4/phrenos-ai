import { NextResponse } from "next/server";
import {
  errorResponse,
  executeResearchRun,
  isServiceRoleConfigured,
  verifyCronOrAdmin,
} from "@/lib/phrenos-updates";

export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    if (!(await verifyCronOrAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required." },
        { status: 503 },
      );
    }

    const runId = await executeResearchRun({ triggerType: "cron" });
    return NextResponse.json({
      ok: true,
      runId,
      message:
        "Weekly research complete. The week's hero story should have an automatic featured blog draft in /admin/ai-updates.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron research failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
