import { NextResponse, after } from "next/server";
import { verifyCronOrAdmin } from "@/lib/phrenos-updates";
import { runHoldingsCheck } from "@/lib/market-desk/alerts";
import { refreshEvents } from "@/lib/market-desk/events";

export const maxDuration = 300;

/** Daily at 07:00 UTC. Always checks holdings; on Mondays it also writes the weekly brief in the background. */
export async function GET(request: Request) {
  if (!(await verifyCronOrAdmin(request))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  // Announcements and the calendar come from free feeds, so they refresh every day without using AI credits.
  await refreshEvents().catch((error) => console.warn("Events refresh failed:", error));
  const summary = await runHoldingsCheck().catch((error) => ({
    error: error instanceof Error ? error.message : "check failed",
  }));

  const monday = new Date().getUTCDay() === 1;
  if (monday) {
    after(async () => {
      try {
        const { generateWeeklyBrief } = await import("@/lib/market-desk/brief");
        await generateWeeklyBrief();
      } catch (error) {
        console.error("Weekly market brief failed:", error);
      }
    });
  }
  return NextResponse.json({ ok: true, holdings: summary, briefQueued: monday });
}
