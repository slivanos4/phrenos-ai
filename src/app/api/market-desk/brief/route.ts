import { adminJson } from "@/lib/market-desk/route";
import { generateWeeklyBrief, latestBrief } from "@/lib/market-desk/brief";

export const maxDuration = 300;

export function GET(request: Request) {
  return adminJson(request, async () => ({ brief: await latestBrief() }));
}

/** Writes this week's brief now. It scans a few hundred prices and makes one AI call, so allow a couple of minutes. */
export function POST(request: Request) {
  return adminJson(request, generateWeeklyBrief);
}
