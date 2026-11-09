import { adminJson } from "@/lib/market-desk/route";
import { getMarketStats } from "@/lib/market-desk/market-stats";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, async () => ({ stats: await getMarketStats(new URL(request.url).searchParams.get("fresh") === "1") }));
}
