import { adminJson } from "@/lib/market-desk/route";
import { buildCompare } from "@/lib/market-desk/compare";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const keys = (new URL(request.url).searchParams.get("keys") ?? "").split(",").map((key) => key.trim()).filter(Boolean);
    return { compare: await buildCompare(keys) };
  });
}
