import { apiJson } from "@/lib/market-desk/api-route";
import { ApiError } from "@/lib/market-desk/api-tokens";
import { pulsesFor } from "@/lib/market-desk/pulse";

/** GET /api/v1/market/pulse?key=cg:bitcoin : the last seven daily Pulses, newest first. */
export function GET(request: Request) {
  return apiJson(request, async () => {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!/^(cg|yahoo):[\w.=^-]+$/.test(key)) throw new ApiError("Use a key such as cg:bitcoin or yahoo:AAPL.", 400);
    return { key, pulses: await pulsesFor(key, 7) };
  });
}
