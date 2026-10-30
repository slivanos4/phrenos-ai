import { NextResponse } from "next/server";
import {
  errorResponse,
  executeResearchRun,
  isServiceRoleConfigured,
  verifyCronOrAdmin,
  verifyCronSecret,
} from "@/lib/phrenos-updates";

export const maxDuration = 300;

// The schedule fires every Sunday, but automatic research only runs every second one (a fortnightly
// cadence, to save credits). Anchored to a fixed Sunday so it never drifts across months or years.
const FORTNIGHT_ANCHOR = Date.UTC(2026, 10, 1);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isRunWeek(now = new Date()) {
  const weeks = Math.floor((now.getTime() - FORTNIGHT_ANCHOR) / WEEK_MS);
  return ((weeks % 2) + 2) % 2 === 0;
}

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

    // Only the scheduler is held to the fortnightly rhythm; an admin calling this route runs it now.
    if (verifyCronSecret(request) && !isRunWeek()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Off week. Automatic research runs every second Sunday.",
      });
    }

    const runId = await executeResearchRun({ triggerType: "cron" });
    return NextResponse.json({
      ok: true,
      runId,
      message:
        "Research complete. The strongest story should have automatic featured blog and LinkedIn drafts in /admin/ai-updates.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron research failed";
    const { body, status } = errorResponse(message);
    return NextResponse.json(body, { status });
  }
}
