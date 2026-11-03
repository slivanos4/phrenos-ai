import { adminJson } from "@/lib/market-desk/route";
import { listRankings, refreshRankings } from "@/lib/market-desk/rankings";

export const maxDuration = 300;

export function GET(request: Request) {
  return adminJson(request, async () => {
    const rows = await listRankings();
    return { rows, updated_at: rows[0]?.updated_at ?? null };
  });
}

/** Rescans everything and rewrites the research notes now, rather than waiting for the Monday run. */
export function POST(request: Request) {
  return adminJson(request, async () => refreshRankings({ notes: true }));
}
