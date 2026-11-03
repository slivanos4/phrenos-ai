import { adminJson } from "@/lib/market-desk/route";
import { findConfluence, listSignals, trackRecord } from "@/lib/market-desk/signals";
import { listLaunches } from "@/lib/market-desk/launches";

export function GET(request: Request) {
  return adminJson(request, async () => {
    const signals = await listSignals();
    return { signals, launches: await listLaunches(), confluence: findConfluence(signals), record: await trackRecord() };
  });
}
