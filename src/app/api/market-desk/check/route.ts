import { adminJson } from "@/lib/market-desk/route";
import { runHoldingsCheck } from "@/lib/market-desk/alerts";
import { runNewsCheck } from "@/lib/market-desk/news-alerts";

export const maxDuration = 300;

/** Runs the holdings check and the news check now, instead of waiting for the scheduled ones. */
export function POST(request: Request) {
  return adminJson(request, async () => {
    const holdings = await runHoldingsCheck();
    const news = await runNewsCheck().catch((error) => {
      console.warn("News check failed:", error);
      return null;
    });
    return { ...holdings, newAlerts: holdings.newAlerts + (news?.alerts ?? 0), newsAlerts: news?.alerts ?? 0 };
  });
}
