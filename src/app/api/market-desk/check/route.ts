import { adminJson } from "@/lib/market-desk/route";
import { runHoldingsCheck } from "@/lib/market-desk/alerts";

export const maxDuration = 300;

/** Runs the holdings check now, instead of waiting for the daily one. */
export function POST(request: Request) {
  return adminJson(request, runHoldingsCheck);
}
