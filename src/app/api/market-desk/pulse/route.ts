import { adminJson } from "@/lib/market-desk/route";
import { generatePulses, pulsesFor } from "@/lib/market-desk/pulse";

export const maxDuration = 120;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const key = new URL(request.url).searchParams.get("key") ?? "";
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
