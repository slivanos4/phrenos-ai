import { adminJson } from "@/lib/market-desk/route";
import { refreshAsset } from "@/lib/market-desk/store";

export const maxDuration = 60;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key) throw new Error("Choose an asset.");
    return { asset: (await refreshAsset(key)).asset };
  });
}
