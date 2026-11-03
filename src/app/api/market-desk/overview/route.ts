import { adminJson } from "@/lib/market-desk/route";
import { buildOverview } from "@/lib/market-desk/overview";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, buildOverview);
}
