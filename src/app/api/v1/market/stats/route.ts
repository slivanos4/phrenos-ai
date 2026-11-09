import { apiJson } from "@/lib/market-desk/api-route";
import { getMarketStats } from "@/lib/market-desk/market-stats";

/** GET /api/v1/market/stats : total crypto market value, Fear and Greed, trending coins and exchange rates. */
export function GET(request: Request) {
  return apiJson(request, async () => ({ stats: await getMarketStats() }));
}
