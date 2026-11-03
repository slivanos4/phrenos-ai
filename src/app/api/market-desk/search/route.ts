import { adminJson } from "@/lib/market-desk/route";
import { searchAssets } from "@/lib/market-desk/providers";

export function GET(request: Request) {
  return adminJson(request, async () => {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return { hits: [] };
    return { hits: await searchAssets(query) };
  });
}
