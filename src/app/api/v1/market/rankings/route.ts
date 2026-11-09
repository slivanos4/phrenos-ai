import { apiJson } from "@/lib/market-desk/api-route";
import { listRankings } from "@/lib/market-desk/rankings";

export const maxDuration = 60;

/** GET /api/v1/market/rankings?type=crypto|stock|etf|commodity|bond&limit=50 */
export function GET(request: Request) {
  return apiJson(request, async () => {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const limit = Math.min(200, Math.max(1, Number(params.get("limit")) || 50));
    const rows = (await listRankings()).filter((row) => !type || row.asset_type === type).slice(0, limit);
    return {
      count: rows.length,
      rankings: rows.map((row) => ({
        key: row.key, rank: row.rank, score: row.score, view: row.view, name: row.name, symbol: row.symbol, type: row.asset_type,
        price_gbp: row.price_gbp, change_1d: row.change_1d, change_7d: row.change_7d, change_30d: row.change_30d, change_90d: row.change_90d,
        market_cap_gbp: row.market_cap_gbp, risk: row.risk_label, risk_score: row.risk_score,
        strengths: row.strengths, concerns: row.concerns, updated_at: row.updated_at,
      })),
    };
  });
}
