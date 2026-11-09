import { apiJson } from "@/lib/market-desk/api-route";
import { ApiError } from "@/lib/market-desk/api-tokens";
import { pulsesFor } from "@/lib/market-desk/pulse";
import { rankingFor } from "@/lib/market-desk/rankings";
import { refreshAsset } from "@/lib/market-desk/store";

export const maxDuration = 60;

/** GET /api/v1/market/asset?key=cg:bitcoin or yahoo:AAPL */
export function GET(request: Request) {
  return apiJson(request, async () => {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!/^(cg|yahoo):[\w.=^-]+$/.test(key)) throw new ApiError("Use a key such as cg:bitcoin or yahoo:AAPL.", 400);
    const { asset } = await refreshAsset(key).catch(() => { throw new ApiError("No price data could be found for that key.", 404); });
    const [ranking, pulses] = await Promise.all([rankingFor(key), pulsesFor(key, 1).catch(() => [])]);
    return {
      asset: {
        key: asset.key, name: asset.name, symbol: asset.symbol, type: asset.asset_type, currency: asset.currency, price: asset.price, price_gbp: asset.price_gbp,
        change_1d: asset.change_1d, change_7d: asset.change_7d, change_30d: asset.change_30d, change_90d: asset.change_90d,
        risk: asset.risk_label, risk_score: asset.risk_score, risk_reasons: asset.risk_reasons, drawdown_1y: asset.drawdown_1y, updated_at: asset.updated_at,
      },
      ranking: ranking ? { rank: ranking.rank, score: ranking.score, view: ranking.view, strengths: ranking.strengths, concerns: ranking.concerns, watch_for: ranking.watch_for, note: ranking.note } : null,
      pulse: pulses[0] ?? null,
    };
  });
}
