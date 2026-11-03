import { adminJson } from "@/lib/market-desk/route";
import { listSignals } from "@/lib/market-desk/signals";
import { listLaunches } from "@/lib/market-desk/launches";

export function GET(request: Request) {
  return adminJson(request, async () => ({ signals: await listSignals(), launches: await listLaunches() }));
}
