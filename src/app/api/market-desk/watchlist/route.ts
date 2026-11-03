import { adminJson } from "@/lib/market-desk/route";
import { addToWatchlist, removeFromWatchlist } from "@/lib/market-desk/store";

export const maxDuration = 60;

export function POST(request: Request) {
  return adminJson(request, async () => {
    const { key } = (await request.json()) as { key?: string };
    if (!key) throw new Error("Choose an asset.");
    await addToWatchlist(key);
    return { ok: true };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const { key } = (await request.json()) as { key?: string };
    if (!key) throw new Error("Choose an asset.");
    await removeFromWatchlist(key);
    return { ok: true };
  });
}
