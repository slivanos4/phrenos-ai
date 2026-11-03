import { adminJson } from "@/lib/market-desk/route";
import { buildDetail } from "@/lib/market-desk/detail";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const params = new URL(request.url).searchParams;
    const key = params.get("key") ?? "";
    if (!key) throw new Error("Choose an asset.");
    return { detail: await buildDetail(key, params.get("alert")) };
  });
}
