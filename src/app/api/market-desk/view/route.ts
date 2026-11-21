import { adminJson } from "@/lib/market-desk/route";
import { getView, refreshViews } from "@/lib/market-desk/views";

export const maxDuration = 120;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key) throw new Error("Choose an asset.");
    return { view: await getView(key) };
  });
}

/** Rewrites the research note and outlook for one asset now, from the latest prices, company results and headlines. */
export function POST(request: Request) {
  return adminJson(request, async () => {
    const { key } = (await request.json()) as { key?: string };
    if (!key) throw new Error("Choose an asset.");
    const result = await refreshViews([key]);
    if (result.written === 0) throw new Error("Could not load prices for that asset just now. Try again in a minute.");
    return { view: await getView(key) };
  });
}
