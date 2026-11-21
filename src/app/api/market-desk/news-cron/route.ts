import { NextResponse } from "next/server";
import { verifyCronOrAdmin } from "@/lib/phrenos-updates";
import { runNewsCheck } from "@/lib/market-desk/news-alerts";

export const maxDuration = 300;

/** Every three hours: looks for important news on what you hold, watch, or the largest assets, and warns you once per story. */
export async function GET(request: Request) {
  if (!(await verifyCronOrAdmin(request))) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runNewsCheck()) });
  } catch (error) {
    console.error("News check failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "News check failed" }, { status: 500 });
  }
}
