import { adminJson } from "@/lib/market-desk/route";
import { listEvents, refreshEvents } from "@/lib/market-desk/events";

export const maxDuration = 120;

export function GET(request: Request) {
  return adminJson(request, async () => ({ events: await listEvents() }));
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const count = await refreshEvents({ includeNews: true });
    return { count, events: await listEvents() };
  });
}
