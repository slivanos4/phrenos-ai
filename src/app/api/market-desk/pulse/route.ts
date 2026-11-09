import { adminJson } from "@/lib/market-desk/route";
import { generatePulses, latestPulses, pulsesFor } from "@/lib/market-desk/pulse";

export const maxDuration = 120;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const params = new URL(request.url).searchParams;
    // Several assets at once, for the dashboard: the newest Pulse for each.
    const keys = (params.get("keys") ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 40);
    if (keys.length > 0) return { latest: Object.fromEntries(await latestPulses(keys)) };
    const key = params.get("key") ?? "";
    if (!key) throw new Error("Choose an asset.");
    return { pulses: await pulsesFor(key) };
  });
}

/** Writes a fresh Pulse for one asset now. */
export function POST(request: Request) {
  return adminJson(request, async () => {
    const { key } = (await request.json()) as { key?: string };
    if (!key) throw new Error("Choose an asset.");
    await generatePulses([key], { force: true });
    return { pulses: await pulsesFor(key) };
  });
}
